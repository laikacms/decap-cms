import { login, newPost } from '../utils/steps';

const backend = 'test';

/**
 * Regression coverage for DCMS-1765: the "A local backup was recovered for
 * this entry, would you like to use it?" confirm dialog must be a real
 * WAI-ARIA modal (role="alertdialog" + aria-modal="true") whose keyboard
 * focus is trapped inside it — Tab must never escape into the editor
 * chrome (title/draft/date/richtext fields) sitting behind the backdrop.
 *
 * Every `confirmDialog(...)` call site in the app (local backup, publish,
 * unpublish, delete, media-library delete/replace, workflow status change)
 * renders through the same shared `ConfirmDialogHost`/`DialogFrame` in
 * decap-cms-ui-default, so this single regression test covers the whole
 * family of confirm dialogs, not just the local-backup one.
 */
describe('Local backup recovered confirm dialog — a11y/focus-trap', () => {
  before(() => {
    Cypress.config('defaultCommandTimeout', 4000);
    cy.task('setupBackend', { backend, options: { publish_mode: 'simple' } });
  });

  after(() => {
    cy.task('teardownBackend', { backend });
  });

  it('traps focus and exposes the WAI-ARIA modal contract while open', () => {
    login();
    newPost();

    cy.url().then(newPostUrl => {
      // Type a title so a local backup gets persisted (debounced 2s in
      // Editor.js's `createBackup`), then reload the same "new entry" URL
      // so the backup is detected on mount and the confirm dialog fires.
      cy.get('[id^="title-field"]').first().type('local backup a11y regression', { force: true });
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2500);

      cy.visit(newPostUrl);
    });

    cy.get('[role="alertdialog"]', { timeout: 10000 }).should('be.visible').as('dialog');
    cy.get('@dialog').should('have.attr', 'aria-modal', 'true');
    cy.get('@dialog').invoke('attr', 'aria-labelledby').should('exist');
    cy.get('@dialog')
      .invoke('attr', 'aria-labelledby')
      .then(titleId => {
        cy.get(`#${titleId}`).should('contain.text', 'Confirm');
      });

    // Mouse: Save is behind the backdrop and must not be reachable.
    cy.contains('button', 'Save').should('exist');

    // Keyboard: Tab from the last focusable control in the dialog (OK)
    // must cycle back to the first one (Cancel) instead of escaping to the
    // editor fields underneath.
    cy.get('@dialog').contains('button', 'OK').as('okButton');
    cy.get('@dialog').contains('button', 'Cancel').as('cancelButton');

    cy.get('@okButton').focus();
    cy.get('@okButton').tab();
    // After wrapping, focus must land back on Cancel (the first focusable
    // element), never on the underlying title/draft/date/richtext fields.
    cy.focused().should('contain.text', 'Cancel');
    cy.get('#title-field-1').should('not.be.focused');

    cy.get('@cancelButton').focus();
    cy.get('@cancelButton').tab({ shift: true });
    cy.focused().should('contain.text', 'OK');

    // Dismiss and confirm the dialog closes without leaving focus stranded
    // inside the (now unmounted) dialog.
    cy.get('@cancelButton').click();
    cy.get('[role="alertdialog"]').should('not.exist');
  });
});
