import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AlertDialogHost, confirmDialog, ConfirmDialogHost, promptDialog, PromptDialogHost, showAlert } from '@/ui';

describe('AlertDialog imperative host (Base UI)', () => {
  it('shows a queued alert and resolves once dismissed', async () => {
    const user = userEvent.setup();
    render(<AlertDialogHost />);

    const resolved = vi.fn();
    showAlert('Not allowed to paste from clipboard.').then(resolved);

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Not allowed to paste from clipboard.');
    expect(resolved).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledTimes(1));
  });

  it('shows queued alerts one at a time, in order', async () => {
    const user = userEvent.setup();
    render(<AlertDialogHost />);

    showAlert('First message');
    showAlert('Second message', { title: 'Heads up', okLabel: 'Got it' });

    const first = await screen.findByRole('alertdialog');
    expect(first).toHaveTextContent('First message');
    expect(first).not.toHaveTextContent('Second message');

    await user.click(screen.getByRole('button', { name: 'OK' }));

    const second = await screen.findByRole('alertdialog');
    expect(second).toHaveTextContent('Heads up');
    expect(second).toHaveTextContent('Second message');

    await user.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('falls back to window.alert when no host is mounted', async () => {
    const windowAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await showAlert('Orphan message');

    expect(windowAlert).toHaveBeenCalledWith('Orphan message');
    windowAlert.mockRestore();
  });
});

describe('AlertDialog modality (DCMS-1632)', () => {
  it('exposes aria-modal="true" on the popup for assistive tech', async () => {
    render(<AlertDialogHost />);
    showAlert('Just a message');

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await userEvent.setup().click(screen.getByRole('button', { name: 'OK' }));
  });

  it('stacks the backdrop and popup above the editor top-bar (z-index: 300)', async () => {
    render(<AlertDialogHost />);
    showAlert('Just a message');

    const dialog = await screen.findByRole('alertdialog');
    const backdrop = document.querySelector('[data-slot="alert-dialog-backdrop"]');
    expect(backdrop).not.toBeNull();

    // The editor's top toolbar (Save, back arrow) sits at z-index: 300
    // (EditorToolbar.tsx). If the "modal" backdrop/popup don't clear every
    // editor-chrome layer, the toolbar wins the stacking order and its
    // buttons stay clickable through the dialog (DCMS-1632).
    expect(Number(getComputedStyle(dialog).zIndex)).toBeGreaterThan(300);
    expect(Number(getComputedStyle(backdrop as Element).zIndex)).toBeGreaterThan(300);

    await userEvent.setup().click(screen.getByRole('button', { name: 'OK' }));
  });
});

describe('AlertDialog stays a11y-visible while open (DCMS-1820)', () => {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  it('self-heals aria-hidden/data-base-ui-inert if Base UI (mis)applies them to the popup subtree itself', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);

    confirmDialog('A local backup was recovered for this entry, would you like to use it?', {
      title: 'Restore backup',
    });

    const dialog = await screen.findByRole('alertdialog', { name: 'Restore backup' });
    const backdrop = document.querySelector('[data-slot="alert-dialog-backdrop"]') as HTMLElement;
    expect(backdrop).not.toBeNull();

    // Simulate Base UI's `markOthers` (floating-ui-react/utils/markOthers.js)
    // wrongly targeting this popup's own nodes instead of only the sibling
    // app root — the exact failure this regression covers. Re-apply at
    // several points across a 200ms-3s window (compressed for test speed)
    // to prove the guard isn't a one-shot fix that only catches the very
    // first application.
    const samplesMs = [0, 25, 120, 260];
    for (const delay of samplesMs) {
      if (delay > 0) await sleep(delay);

      dialog.setAttribute('aria-hidden', 'true');
      dialog.setAttribute('data-base-ui-inert', '');
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('data-base-ui-inert', '');

      await waitFor(() => {
        expect(dialog).not.toHaveAttribute('aria-hidden', 'true');
        expect(dialog).not.toHaveAttribute('data-base-ui-inert');
        expect(backdrop).not.toHaveAttribute('aria-hidden', 'true');
        expect(backdrop).not.toHaveAttribute('data-base-ui-inert');
      });
    }

    // Screen readers/Playwright locate the dialog by its accessible name —
    // only possible if nothing in its ancestor chain is aria-hidden.
    expect(screen.getByRole('alertdialog', { name: 'Restore backup' })).toBe(dialog);
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'OK' })).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('never marks the popup/backdrop hidden across the whole open lifetime on a clean run', async () => {
    render(<ConfirmDialogHost />);

    confirmDialog('Just checking', { title: 'Restore backup' });

    const dialog = await screen.findByRole('alertdialog', { name: 'Restore backup' });
    const backdrop = document.querySelector('[data-slot="alert-dialog-backdrop"]') as HTMLElement;

    for (const delay of [0, 25, 120, 260]) {
      if (delay > 0) await sleep(delay);
      expect(dialog).not.toHaveAttribute('aria-hidden', 'true');
      expect(dialog).not.toHaveAttribute('data-base-ui-inert');
      expect(backdrop).not.toHaveAttribute('aria-hidden', 'true');
      expect(backdrop).not.toHaveAttribute('data-base-ui-inert');
    }

    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Cancel' }));
  });
});

describe('AlertDialog stacking (DCMS-2253)', () => {
  it('when two dialogs are open at once, only the most-recently-opened is interactive and offset from the older one', async () => {
    render(
      <>
        <PromptDialogHost />
        <ConfirmDialogHost />
      </>,
    );

    promptDialog('Insert image URL');
    // Prompt renders as role="dialog" (DCMS-2251); the confirm below keeps
    // role="alertdialog". Query each by its own role.
    const promptDialogEl = await screen.findByRole('dialog', { hidden: true });
    expect(promptDialogEl).not.toHaveAttribute('inert');

    // A second, unrelated dialog opens while the prompt is still up (the
    // exact DCMS-2253 shape: nav-guard confirm arriving while the
    // "Insert from URL" prompt is open).
    const resolved = vi.fn();
    confirmDialog('You have unsaved changes.', { title: 'Unsaved changes' }).then(resolved);

    const confirmDialogEl = await screen.findByRole('alertdialog', { hidden: true });

    // Only the top-most (the just-opened confirm) is focusable/interactive,
    // and reachable via the default (non-hidden) role query.
    expect(confirmDialogEl).not.toHaveAttribute('inert');
    expect(screen.getByRole('alertdialog')).toBe(confirmDialogEl);
    expect(promptDialogEl).toHaveAttribute('inert', '');

    // Visible z-offset: the top-most sits exactly centered (offset 0), the
    // older one behind it is shifted and rendered at a lower stacking order.
    const topStyle = getComputedStyle(confirmDialogEl);
    const backStyle = getComputedStyle(promptDialogEl);
    expect(topStyle.transform).not.toBe(backStyle.transform);
    expect(Number(topStyle.zIndex)).toBeGreaterThan(Number(backStyle.zIndex));

    // Only one backdrop is rendered (the top-most dialog's), so the older
    // dialog's darkened area doesn't compound into an extra layer.
    expect(document.querySelectorAll('[data-slot="alert-dialog-backdrop"]')).toHaveLength(1);

    await userEvent.setup().click(within(confirmDialogEl).getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(true));

    // Once the top-most dialog settles, the previously-stacked prompt
    // becomes top-most again and regains interactivity.
    await waitFor(() => expect(promptDialogEl).not.toHaveAttribute('inert'));
    await userEvent.setup().click(within(promptDialogEl).getByRole('button', { name: 'Cancel' }));
  });
});

describe('ConfirmDialog imperative host (Base UI), DCMS-658', () => {
  it('resolves true when the confirm action is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);

    const resolved = vi.fn();
    confirmDialog('Delete this entry?', { destructive: true }).then(resolved);

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete this entry?');
    expect(resolved).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(true));
  });

  it('resolves false when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);

    const resolved = vi.fn();
    confirmDialog('Publish this entry?').then(resolved);

    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(false));
  });

  it('resolves false on Escape dismissal (cannot be silenced like window.confirm)', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);

    const resolved = vi.fn();
    confirmDialog('Unpublish this entry?').then(resolved);

    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(false));
  });

  it('shows queued confirms one at a time, in order', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);

    const firstResolved = vi.fn();
    const secondResolved = vi.fn();
    confirmDialog('First confirm').then(firstResolved);
    confirmDialog('Second confirm', { confirmLabel: 'Yes, delete' }).then(secondResolved);

    const first = await screen.findByRole('alertdialog');
    expect(first).toHaveTextContent('First confirm');

    await user.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(firstResolved).toHaveBeenCalledWith(true));

    const second = await screen.findByRole('alertdialog');
    expect(second).toHaveTextContent('Second confirm');

    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(secondResolved).toHaveBeenCalledWith(true));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('falls back to window.confirm when no host is mounted', async () => {
    const windowConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await expect(confirmDialog('Orphan confirm')).resolves.toBe(true);

    expect(windowConfirm).toHaveBeenCalledWith('Orphan confirm');
    windowConfirm.mockRestore();
  });

  it('restores focus to the trigger element on Cancel click (DCMS-674)', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Open trigger</button>
        <ConfirmDialogHost />
      </>,
    );

    const trigger = screen.getByRole('button', { name: 'Open trigger' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    confirmDialog('Delete this entry?');
    await screen.findByRole('alertdialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });
});

describe('PromptDialog a11y semantics (DCMS-2251)', () => {
  it('renders the "Insert image URL" prompt with role="dialog", not "alertdialog", and keeps aria-modal', async () => {
    render(<PromptDialogHost />);

    promptDialog('Insert image URL');

    // The prompt is a routine form input, not an alert/confirmation
    // requiring an immediate response — role="alertdialog" gives assistive
    // tech the wrong signal (DCMS-2251), same class of bug as DCMS-659.
    const dialog = await screen.findByRole('dialog', { name: 'Prompt' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Cancel' }));
  });
});

describe('PromptDialog imperative host (Base UI), DCMS-658/DCMS-674', () => {
  it('resolves with the entered value when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const resolved = vi.fn();
    promptDialog('Insert image URL').then(resolved);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Insert image URL');

    await user.click(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'https://example.com/cat.png');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledWith('https://example.com/cat.png'));
  });

  it('exposes an accessible name on the input derived from the message (DCMS-1333)', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const resolved = vi.fn();
    promptDialog('Enter the URL of the image').then(resolved);

    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('textbox', { name: 'Enter the URL of the image' });
    expect(input).toBeInTheDocument();

    // Settle the prompt so its module-level queue entry doesn't leak into
    // subsequent tests (the queue lives outside React state).
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(null));
  });

  it('resolves with null on Cancel click', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const resolved = vi.fn();
    promptDialog('Insert image URL').then(resolved);

    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(null));
  });

  it('falls back to window.prompt when no host is mounted', async () => {
    const windowPrompt = vi.spyOn(window, 'prompt').mockReturnValue('fallback value');

    await expect(promptDialog('Orphan prompt')).resolves.toBe('fallback value');

    expect(windowPrompt).toHaveBeenCalledWith('Orphan prompt', undefined);
    windowPrompt.mockRestore();
  });

  it('restores focus to the trigger element on Cancel click (DCMS-674)', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Insert from URL</button>
        <PromptDialogHost />
      </>,
    );

    const trigger = screen.getByRole('button', { name: 'Insert from URL' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    promptDialog('Insert image URL');
    // The Input inside the popup steals focus into the popup on open
    // (autoFocus). Confirming the trigger no longer holds focus reproduces
    // the DCMS-674 setup before asserting the dismissal path restores it.
    await waitFor(() => expect(document.activeElement).not.toBe(trigger));

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });

  it('restores focus to the trigger element on Escape dismissal (DCMS-674)', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Insert from URL</button>
        <PromptDialogHost />
      </>,
    );

    const trigger = screen.getByRole('button', { name: 'Insert from URL' });
    trigger.focus();

    promptDialog('Insert image URL');
    await waitFor(() => expect(document.activeElement).not.toBe(trigger));

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });

  it('restores focus to the trigger element on Enter-key dismissal (DCMS-674)', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Insert from URL</button>
        <PromptDialogHost />
      </>,
    );

    const trigger = screen.getByRole('button', { name: 'Insert from URL' });
    trigger.focus();

    const resolved = vi.fn();
    promptDialog('Insert image URL').then(resolved);
    await waitFor(() => expect(document.activeElement).not.toBe(trigger));

    await user.type(screen.getByRole('textbox'), 'https://example.com/dog.png{Enter}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledWith('https://example.com/dog.png'));
    expect(document.activeElement).toBe(trigger);
  });

  // DCMS-2161: a caller that omits title/cancelLabel/confirmLabel used to
  // get hardcoded English ("Prompt"/"Cancel"/"OK") baked into the JSX
  // regardless of locale. `PromptDialogHost` now routes those fallbacks
  // through the `t` prop `DecapCmsProvider` feeds it, so a non-English
  // locale's translator produces non-English chrome even when the caller
  // itself only translated the message.
  it('falls back to the `t` prop, not a hardcoded English literal, when a caller omits title/cancelLabel/confirmLabel', async () => {
    const t = vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'ui.prompt.title': 'Eingabeaufforderung',
        'ui.confirm.cancel': 'Abbrechen',
        'ui.confirm.ok': 'Bestätigen',
      };
      return translations[key] ?? key;
    });

    render(<PromptDialogHost t={t} />);
    promptDialog('Enter the URL of the image');

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Eingabeaufforderung')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Bestätigen' })).toBeInTheDocument();
    expect(within(dialog).queryByText('Prompt')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();

    expect(t).toHaveBeenCalledWith('ui.prompt.title');
    expect(t).toHaveBeenCalledWith('ui.confirm.cancel');
    expect(t).toHaveBeenCalledWith('ui.confirm.ok');

    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
  });

  it('still falls back to the untranslated English literal when no `t` prop is supplied (e.g. Storybook)', async () => {
    render(<PromptDialogHost />);
    promptDialog('Enter the URL of the image');

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Prompt')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'OK' })).toBeInTheDocument();

    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Cancel' }));
  });
});

// DCMS-2252: `validate` lets a caller (the image widget's "Insert from URL"
// flow) reject a submitted value without the dialog closing, showing an
// inline error instead of the previous post-hoc showAlert()-then-close
// pattern that lost the user's input.
describe('PromptDialog validate option (DCMS-2252)', () => {
  it('keeps the dialog open and shows the validator message when validate rejects', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const resolved = vi.fn();
    promptDialog('Insert image URL', { validate: () => 'Not a valid URL.' }).then(resolved);

    const dialog = await screen.findByRole('dialog');
    await user.type(screen.getByRole('textbox'), 'notaurl');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await screen.findByText('Not a valid URL.');
    expect(dialog).toBeInTheDocument();
    expect(resolved).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(null));
  });

  it('settles with the value once validate accepts it', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const validate = vi.fn(async (value: string) => (value.startsWith('https://') ? undefined : 'Invalid'));
    const resolved = vi.fn();
    promptDialog('Insert image URL', { validate }).then(resolved);

    await screen.findByRole('dialog');
    await user.type(screen.getByRole('textbox'), 'https://example.com/cat.png');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledWith('https://example.com/cat.png'));
    expect(validate).toHaveBeenCalledWith('https://example.com/cat.png');
  });

  it('clears a previous error as soon as the user edits the input again', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    promptDialog('Insert image URL', { validate: () => 'Not a valid URL.' });

    await screen.findByRole('dialog');
    const input = screen.getByRole('textbox');
    await user.type(input, 'notaurl');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await screen.findByText('Not a valid URL.');

    await user.type(input, 'x');
    expect(screen.queryByText('Not a valid URL.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('an async validator that rejects with an Error surfaces the error message inline', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const resolved = vi.fn();
    promptDialog('Insert image URL', {
      validate: async () => {
        throw new Error('Network error.');
      },
    }).then(resolved);

    await screen.findByRole('dialog');
    await user.type(screen.getByRole('textbox'), 'https://example.com/cat.png');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await screen.findByText('Network error.');
    expect(resolved).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(null));
  });

  it('disables the confirm button (and no-ops Enter) while validationError is set, and re-enables once the input changes (DCMS-2260)', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const validate = vi.fn(() => 'This URL is not valid.');
    const resolved = vi.fn();
    promptDialog('Insert image URL', { validate }).then(resolved);

    await screen.findByRole('dialog');
    const input = screen.getByRole('textbox');
    await user.type(input, 'notaurl');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await screen.findByText('This URL is not valid.');

    const confirmButton = screen.getByRole('button', { name: 'OK' });
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute('aria-disabled', 'true');
    expect(validate).toHaveBeenCalledTimes(1);

    // Pressing Enter while the error is still showing must not re-run
    // validate() - the button is inert, and submit() itself no-ops.
    await user.type(input, '{Enter}');
    expect(validate).toHaveBeenCalledTimes(1);
    expect(resolved).not.toHaveBeenCalled();

    // Editing the input clears the error and re-enables the button.
    await user.type(input, 'x');
    expect(screen.queryByText('This URL is not valid.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(null));
  });
});
