import {
  colorError,
  colorNormal,
  editorStatus,
  notifications,
  publishTypes,
  textColorNormal,
  workflowStatus,
} from './constants';

interface User {
  netlifySiteURL?: string;
  email?: string;
  password?: string;
}

interface Entry {
  title: string;
  body?: string;
  [key: string]: string | undefined;
}

interface ColorOnOptions {
  type?: 'label' | 'field';
  label?: string;
  scope?: Cypress.Chainable;
  el?: Cypress.Chainable;
}

interface FieldErrorOptions {
  scope?: Cypress.Chainable;
}

interface ValidationError {
  message: string;
  fieldLabel: string;
}

interface ObjectFieldSettings {
  limit: number;
  author: string;
}

interface ListFieldSettings {
  name: string;
  description: string;
}

interface Clock {
  tick: (ms: number) => void;
}

export function login(user?: User): void {
  console.log('[login] START user=', user ? 'yes' : 'no', 'netlifySiteURL=', user?.netlifySiteURL || 'none');
  cy.viewport(1200, 1200);
  if (user) {
    console.log('[login] About to cy.visit("/")');
    cy.visit('/', {
      onBeforeLoad: () => {
        // https://github.com/cypress-io/cypress/issues/1208
        window.indexedDB.deleteDatabase('localforage');
        window.localStorage.setItem('decap-cms-user', JSON.stringify(user));
        if (user.netlifySiteURL) {
          window.localStorage.setItem('netlifySiteURL', user.netlifySiteURL);
        }
        console.log('[login] onBeforeLoad complete');
      },
    }).then(() => {
      console.log('[login] cy.visit completed');
    });
    if (user.netlifySiteURL && user.email && user.password) {
      console.log('[login] Filling login form');
      cy.get('input[name="email"]', { timeout: 10000 }).clear();
      cy.get('input[name="email"]').type(user.email);
      cy.get('input[name="password"]').clear();
      cy.get('input[name="password"]').type(user.password);
      cy.contains('button', 'Login').click();
      console.log('[login] Login button clicked');
    }
  } else {
    cy.visit('/');
    cy.contains('button', 'Login').click();
  }
  console.log('[login] Waiting for New Post link');
  cy.contains('a', 'New Post', { timeout: 60000 }).then(() => {
    console.log('[login] New Post link found - COMPLETE');
  });
}

function withExistingClock(callback: (clock: Clock) => void): Cypress.Chainable {
  return cy.then(() => {
    const clock = cy.state('clock') as Clock | undefined;
    if (clock) {
      callback(clock);
    }
  });
}

export function assertNotification(message: string): void {
  // if clock is use, a tick is needed for toastify to show the notifications
  withExistingClock(clock => {
    advanceClock(clock);
  });
  cy.get('.notif__container').within(() => {
    cy.contains(message);
    cy.contains(message).invoke('hide');
  });
}

function assertColorOn(cssProperty: string, color: string, opts: ColorOnOptions): void {
  if (opts.type && opts.type === 'label') {
    (opts.scope ? opts.scope : cy).contains('label', opts.label!).should($el => {
      expect($el).to.have.css(cssProperty, color);
    });
  } else if (opts.type && opts.type === 'field') {
    const assertion = ($el: JQuery) => expect($el).to.have.css(cssProperty, color);
    (opts.scope ? opts.scope : cy)
      .contains('label', opts.label!)
      .parents()
      .next()
      .should(assertion);
  } else if (opts.el) {
    opts.el.should($el => {
      expect($el).to.have.css(cssProperty, color);
    });
  }
}

export function exitEditor(): void {
  cy.contains('a', 'Writing in').click();
}

export function goToWorkflow(): void {
  cy.contains('a', 'Workflow').click();
}

export function goToCollections(): void {
  cy.contains('a', 'Content').click();
}

export function goToMediaLibrary(): void {
  cy.contains('button', 'Media').click();
}

export function assertUnpublishedEntryInEditor(): void {
  cy.contains('button', 'Delete unpublished entry');
}

export function assertPublishedEntryInEditor(): void {
  cy.contains('button', 'Delete published entry');
}

export function assertUnpublishedChangesInEditor(): void {
  cy.contains('button', 'Delete unpublished changes');
}

export function goToEntry(entry: Entry): void {
  goToCollections();
  cy.get('a h2')
    .first()
    .contains(entry.title)
    .click();
}

export function updateWorkflowStatus({ title }: Entry, fromColumnHeading: string, toColumnHeading: string): void {
  cy.contains('h2', fromColumnHeading)
    .parent()
    .contains('a', title)
    .drag();
  cy.contains('h2', toColumnHeading)
    .parent()
    .drop();
  assertNotification(notifications.updated);
}

export function publishWorkflowEntry({ title }: Entry, timeout?: number): void {
  cy.contains('h2', workflowStatus.ready, timeout !== undefined ? { timeout } : undefined)
    .parent()
    .within(() => {
      cy.contains('a', title)
        .parent()
        .within(() => {
          cy.contains('button', 'Publish new entry').click({ force: true });
        });
    });
  // assertNotification(notifications.published);
}

export function deleteWorkflowEntry({ title }: Entry): void {
  cy.contains('a', title)
    .parent()
    .within(() => {
      cy.contains('button', 'Delete new entry').click({ force: true });
    });

  assertNotification(notifications.deletedUnpublished);
}

const STATUS_BUTTON_TEXT = 'Status:';

export function assertWorkflowStatusInEditor(status: string): void {
  cy.contains('[role="button"]', STATUS_BUTTON_TEXT).as('setStatusButton');
  cy.get('@setStatusButton')
    .parent()
    .within(() => {
      cy.get('@setStatusButton').click();
      cy.contains('[role="menuitem"] span', status)
        .parent()
        .within(() => {
          cy.get('svg');
        });
      cy.get('@setStatusButton').click();
    });
}

export function assertPublishedEntry(entry: Entry | Entry[]): void {
  if (Array.isArray(entry)) {
    const entries = entry.reverse();
    cy.get('a h2').then(els => {
      cy.wrap(els.slice(0, entries.length)).each((el, idx) => {
        cy.wrap(el).contains(entries[idx].title);
      });
    });
  } else {
    cy.get('a h2')
      .first()
      .contains(entry.title);
  }
}

export function deleteEntryInEditor(): void {
  cy.contains('button', 'Delete').click();
  assertNotification(notifications.deletedUnpublished);
}

export function assertOnCollectionsPage(): void {
  cy.url().should('contain', '/#/collections/posts');
}

export function assertEntryDeleted(entry: Entry | Entry[]): void {
  cy.get('body').then($body => {
    const entriesHeaders = $body.find('a h2');
    if (entriesHeaders.length > 0) {
      if (Array.isArray(entry)) {
        const titles = entry.map(e => e.title);
        cy.get('a h2').each(el => {
          expect(titles).not.to.include(el.text());
        });
      } else {
        cy.get('a h2').each(el => {
          expect(entry.title).not.to.equal(el.text());
        });
      }
    }
  });
}

export function assertWorkflowStatus({ title }: Entry, status: string): void {
  cy.contains('h2', status)
    .parent()
    .contains('a', title);
}

export function updateWorkflowStatusInEditor(newStatus: string): void {
  selectDropdownItem(STATUS_BUTTON_TEXT, newStatus);
  assertNotification(notifications.updated);
}

export function publishEntryInEditor(publishType: string): void {
  selectDropdownItem('Publish', publishType);
  assertNotification(notifications.published);
}

export function publishAndCreateNewEntryInEditor(): void {
  selectDropdownItem('Publish', publishTypes.publishAndCreateNew);
  assertNotification(notifications.published);
  cy.url().should('eq', `http://localhost:8080/#/collections/posts/new`);
  cy.get('[id^="title-field"]').should('have.value', '');
}

export function publishAndDuplicateEntryInEditor(entry: Entry): void {
  selectDropdownItem('Publish', publishTypes.publishAndDuplicate);
  assertNotification(notifications.published);
  cy.url().should('eq', `http://localhost:8080/#/collections/posts/new`);
  cy.get('[id^="title-field"]').should('have.value', entry.title);
}

function selectDropdownItem(label: string, item: string): void {
  cy.contains('[role="button"]', label).as('dropDownButton');
  cy.get('@dropDownButton')
    .parent()
    .within(() => {
      cy.get('@dropDownButton').click();
      cy.contains('[role="menuitem"] span', item).click();
    });
}

export function flushClockAndSave(): void {
  withExistingClock(clock => {
    // some input fields are de-bounced thus require advancing the clock
    advanceClock(clock);
  });

  cy.contains('button', 'Save').click();
}

export function populateEntry(entry: Entry, onDone: () => void = flushClockAndSave): void {
  const keys = Object.keys(entry);
  for (const key of keys) {
    const value = entry[key];
    if (!value) continue;
    cy.get(`[id^="${key}-field"]`)
      .first()
      .clear({ force: true });
    cy.get(`[id^="${key}-field"]`)
      .first()
      .type(value, { force: true });
  }

  onDone();
}

export function newPost(): void {
  // click even if covered by toast
  cy.contains('a', 'New Post').click({ force: true });
}

export function createPost(entry: Entry): void {
  newPost();
  populateEntry(entry);
}

export function createPostAndExit(entry: Entry): void {
  createPost(entry);
  withExistingClock(clock => {
    advanceClock(clock);
  });
  exitEditor();
}

function advanceClock(clock: Clock | undefined): void {
  if (clock) {
    // https://github.com/cypress-io/cypress/issues/1273
    clock.tick(150);
    clock.tick(150);
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
  }
}

export function publishEntry({ createNew = false, duplicate = false } = {}): void {
  cy.then(() => {
    const clock = cy.state('clock') as Clock | undefined;

    // some input fields are de-bounced thus require advancing the clock
    advanceClock(clock);

    if (createNew) {
      advanceClock(clock);
      selectDropdownItem('Publish', publishTypes.publishAndCreateNew);
      advanceClock(clock);
    } else if (duplicate) {
      advanceClock(clock);
      selectDropdownItem('Publish', publishTypes.publishAndDuplicate);
      advanceClock(clock);
    } else {
      selectDropdownItem('Publish', publishTypes.publishNow);
    }

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
  });
}

export function createPostAndPublish(entry: Entry): void {
  newPost();
  populateEntry(entry, publishEntry);
  exitEditor();
}

export function createPostPublishAndCreateNew(entry: Entry): void {
  newPost();
  populateEntry(entry, () => publishEntry({ createNew: true }));
  cy.url().should('eq', `http://localhost:8080/#/collections/posts/new`);
  // TODO: fix this test
  // previous entry data is somehow not cleared from the editor when opening new post
  // cy.get('[id^="title-field"]').should('have.value', '');

  exitEditor();
}

export function createPostPublishAndDuplicate(entry: Entry): void {
  newPost();
  populateEntry(entry, () => publishEntry({ duplicate: true }));
  cy.url().should('eq', `http://localhost:8080/#/collections/posts/new`);
  cy.get('[id^="title-field"]').should('have.value', entry.title);

  exitEditor();
}

export function editPostAndPublish(entry1: Entry, entry2: Entry): void {
  goToEntry(entry1);
  cy.contains('button', 'Delete entry');
  cy.contains('span', 'Published');

  populateEntry(entry2, publishEntry);
  // existing entry slug should remain the same after save
  cy.url().should(
    'eq',
    `http://localhost:8080/#/collections/posts/entries/1970-01-01-${
      entry1.title
        .toLowerCase()
        .replace(/\s/, '-')
    }`,
  );
}

export function editPostPublishAndCreateNew(entry1: Entry, entry2: Entry): void {
  goToEntry(entry1);
  cy.contains('button', 'Delete entry');
  cy.contains('span', 'Published');

  populateEntry(entry2, () => publishEntry({ createNew: true }));
  cy.url().should('eq', `http://localhost:8080/#/collections/posts/new`);
  cy.get('[id^="title-field"]').should('have.value', '');
}

export function editPostPublishAndDuplicate(entry1: Entry, entry2: Entry): void {
  goToEntry(entry1);
  cy.contains('button', 'Delete entry');
  cy.contains('span', 'Published');

  populateEntry(entry2, () => publishEntry({ duplicate: true }));
  cy.url().should('eq', `http://localhost:8080/#/collections/posts/new`);
  cy.get('[id^="title-field"]').should('have.value', entry2.title);
}

export function duplicatePostAndPublish(entry1: Entry): void {
  goToEntry(entry1);
  cy.contains('button', 'Delete entry');
  selectDropdownItem('Published', 'Duplicate');
  publishEntry();

  cy.url().should(
    'eq',
    `http://localhost:8080/#/collections/posts/entries/1970-01-01-${
      entry1.title
        .toLowerCase()
        .replace(/\s/, '-')
    }-1`,
  );
}

export function updateExistingPostAndExit(fromEntry: Entry, toEntry: Entry): void {
  goToWorkflow();
  cy.contains('h2', fromEntry.title)
    .parent()
    .click({ force: true });
  populateEntry(toEntry);
  exitEditor();
  goToWorkflow();
  cy.contains('h2', toEntry.title);
}

export function unpublishEntry(entry: Entry): void {
  goToCollections();
  cy.contains('h2', entry.title)
    .parent()
    .click({ force: true });
  selectDropdownItem('Published', 'Unpublish');
  assertNotification(notifications.unpublished);
  goToWorkflow();
  assertWorkflowStatus(entry, workflowStatus.ready);
}

export function duplicateEntry(entry: Entry): void {
  selectDropdownItem('Published', 'Duplicate');
  cy.url().should('contain', '/#/collections/posts/new');
  flushClockAndSave();
  updateWorkflowStatusInEditor(editorStatus.ready);
  publishEntryInEditor(publishTypes.publishNow);
  exitEditor();
  cy.get('a h2').should($h2s => {
    expect($h2s.eq(0)).to.contain(entry.title);
    expect($h2s.eq(1)).to.contain(entry.title);
  });
}

export function validateObjectFields({ limit, author }: ObjectFieldSettings): void {
  cy.get('a[href^="#/collections/settings"]').click();
  cy.get('a[href^="#/collections/settings/entries/general"]').click();
  cy.get('input[type=number]').type(String(limit));
  cy.contains('button', 'Save').click();
  assertNotification(notifications.error.missingField);
  assertFieldErrorStatus('Default Author', colorError);
  cy.contains('label', 'Default Author').click();
  cy.focused().type(author);
  cy.contains('button', 'Save').click();
  assertNotification(notifications.saved);
  assertFieldErrorStatus('Default Author', colorNormal);
}

export function validateNestedObjectFields({ limit, author }: ObjectFieldSettings): void {
  cy.get('a[href^="#/collections/settings"]').click();
  cy.get('a[href^="#/collections/settings/entries/general"]').click();
  cy.contains('label', 'Default Author').click();
  cy.focused().type(author);
  cy.contains('button', 'Save').click();
  assertNotification(notifications.error.missingField);
  cy.get('input[type=number]').as('limitInput');
  cy.get('@limitInput').type(String(limit + 1));
  cy.contains('button', 'Save').click();
  assertFieldValidationError(notifications.validation.range);
  cy.get('@limitInput').clear();
  cy.get('@limitInput').type('-1');
  cy.contains('button', 'Save').click();
  assertFieldValidationError(notifications.validation.range);
  cy.get('@limitInput').clear();
  cy.get('@limitInput').type(String(limit));
  cy.contains('button', 'Save').click();
  assertNotification(notifications.saved);
}

export function validateListFields({ name, description }: ListFieldSettings): void {
  cy.get('a[href^="#/collections/settings"]').click();
  cy.get('a[href^="#/collections/settings/entries/authors"]').click();
  cy.contains('button', 'Add').click();
  cy.contains('button', 'Save').click();
  assertNotification(notifications.error.missingField);
  assertFieldErrorStatus('Authors', colorError);
  cy.get('div[class*=SortableListItem]')
    .eq(2)
    .as('listControl');
  assertFieldErrorStatus('Name', colorError, { scope: cy.get('@listControl') });
  assertColorOn('background-color', colorError, {
    type: 'label',
    label: 'Description',
    scope: cy.get('@listControl'),
  });
  assertListControlErrorStatus([colorError, colorError], '@listControl');
  cy.get('@listControl').find('input[type=text]').filter(':visible').first().type(name);
  cy.get('@listControl').find('textarea').filter(':visible').first().type(description);
  flushClockAndSave();
  assertNotification(notifications.saved);
  assertFieldErrorStatus('Authors', colorNormal);
}

export function validateNestedListFields(): void {
  cy.get('a[href^="#/collections/settings"]').click();
  cy.get('a[href^="#/collections/settings/entries/hotel_locations"]').click();

  // add first city list item
  cy.contains('button', 'hotel locations').click();
  cy.contains('button', 'cities').click();
  cy.contains('label', 'City')
    .parents()
    .next()
    .first()
    .type('Washington DC');
  cy.contains('label', 'Number of Hotels in City')
    .parents()
    .next()
    .first()
    .type('5');
  cy.contains('button', 'city locations').click();

  // add second city list item
  cy.contains('button', 'cities').click();
  cy.contains('label', 'Cities')
    .parents()
    .next()
    .first()
    .find('div[class*=SortableListItem]')
    .eq(2)
    .as('secondCitiesListControl');
  cy.get('@secondCitiesListControl')
    .contains('label', 'City')
    .parents()
    .next()
    .first()
    .type('Boston');
  cy.get('@secondCitiesListControl')
    .contains('button', 'city locations')
    .click();

  cy.contains('button', 'Save').click();
  assertNotification(notifications.error.missingField);

  // assert on fields
  assertFieldErrorStatus('Hotel Locations', colorError);
  assertFieldErrorStatus('Cities', colorError);
  assertFieldErrorStatus('City', colorNormal);
  assertFieldErrorStatus('City', colorNormal, { scope: cy.get('@secondCitiesListControl') });
  assertFieldErrorStatus('Number of Hotels in City', colorNormal);
  assertFieldErrorStatus('Number of Hotels in City', colorError, {
    scope: cy.get('@secondCitiesListControl'),
  });
  assertFieldErrorStatus('City Locations', colorError);
  assertFieldErrorStatus('City Locations', colorError, {
    scope: cy.get('@secondCitiesListControl'),
  });
  assertFieldErrorStatus('Hotel Name', colorError);
  assertFieldErrorStatus('Hotel Name', colorError, { scope: cy.get('@secondCitiesListControl') });

  // list control aliases
  cy.contains('label', 'Hotel Locations')
    .parents()
    .next()
    .find('div[class*=SortableListItem]')
    .first()
    .as('hotelLocationsListControl');
  cy.contains('label', 'Cities')
    .parents()
    .next()
    .find('div[class*=SortableListItem]')
    .eq(0)
    .as('firstCitiesListControl');
  cy.contains('label', 'City Locations')
    .parents()
    .next()
    .find('div[class*=SortableListItem]')
    .eq(0)
    .as('firstCityLocationsListControl');
  cy.contains('label', 'Cities')
    .parents()
    .next()
    .find('div[class*=SortableListItem]')
    .eq(3)
    .as('secondCityLocationsListControl');

  // assert on list controls
  assertListControlErrorStatus([colorError, colorError], '@hotelLocationsListControl');
  assertListControlErrorStatus([colorError, colorError], '@firstCitiesListControl');
  assertListControlErrorStatus([colorError, colorError], '@secondCitiesListControl');
  assertListControlErrorStatus([colorError, colorError], '@firstCityLocationsListControl');
  assertListControlErrorStatus([colorError, colorError], '@secondCityLocationsListControl');

  cy.contains('label', 'Hotel Name')
    .parents()
    .next()
    .first()
    .type('The Ritz Carlton');
  cy.contains('button', 'Save').click();
  assertNotification(notifications.error.missingField);
  assertListControlErrorStatus([colorNormal, textColorNormal], '@firstCitiesListControl');

  // fill out rest of form and save
  cy.get('@secondCitiesListControl')
    .contains('label', 'Number of Hotels in City')
    .parents()
    .next()
    .first()
    .type('3');
  cy.get('@secondCitiesListControl')
    .contains('label', 'Hotel Name')
    .parents()
    .next()
    .first()
    .type('Grand Hyatt');
  cy.contains('label', 'Country')
    .parents()
    .next()
    .first()
    .type('United States');
  flushClockAndSave();
  assertNotification(notifications.saved);
}

export function validateObjectFieldsAndExit(setting: ObjectFieldSettings): void {
  validateObjectFields(setting);
  exitEditor();
}

export function validateNestedObjectFieldsAndExit(setting: ObjectFieldSettings): void {
  validateNestedObjectFields(setting);
  exitEditor();
}

export function validateListFieldsAndExit(setting: ListFieldSettings): void {
  validateListFields(setting);
  exitEditor();
}

export function validateNestedListFieldsAndExit(): void {
  validateNestedListFields();
  exitEditor();
}

export function assertFieldValidationError({ message, fieldLabel }: ValidationError): void {
  cy.contains('label', fieldLabel)
    .siblings('ul[class*=ControlErrorsList]')
    .contains(message);
  assertFieldErrorStatus(fieldLabel, colorError);
}

function assertFieldErrorStatus(label: string, color: string, opts: FieldErrorOptions = {}): void {
  assertColorOn('background-color', color, {
    type: 'label',
    label,
    scope: opts.scope,
  });
  assertColorOn('border-color', color, {
    type: 'field',
    label,
    scope: opts.scope,
  });
}

function assertListControlErrorStatus(colors: [string, string] = ['', ''], alias: string): void {
  cy.get(alias).within(() => {
    // assert list item border has correct color
    assertColorOn('border-right-color', colors[0], {
      el: cy
        .root()
        .children()
        .eq(2),
    });
    // collapse list item
    cy.get('button[class*=TopBarButton-button]')
      .first()
      .click();
    // assert list item label text has correct color
    assertColorOn('color', colors[1], { el: cy.get('div[class*=NestedObjectLabel]').first() });
    // uncollapse list item
    cy.get('button[class*=TopBarButton-button]')
      .first()
      .click();
  });
}
