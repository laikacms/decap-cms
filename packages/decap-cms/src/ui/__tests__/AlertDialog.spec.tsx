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

describe('PromptDialog imperative host (Base UI), DCMS-658/DCMS-674', () => {
  it('resolves with the entered value when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const resolved = vi.fn();
    promptDialog('Insert image URL').then(resolved);

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Insert image URL');

    await user.click(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'https://example.com/cat.png');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(resolved).toHaveBeenCalledWith('https://example.com/cat.png'));
  });

  it('exposes an accessible name on the input derived from the message (DCMS-1333)', async () => {
    const user = userEvent.setup();
    render(<PromptDialogHost />);

    const resolved = vi.fn();
    promptDialog('Enter the URL of the image').then(resolved);

    const dialog = await screen.findByRole('alertdialog');
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

    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
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

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
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

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
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

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
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

    const dialog = await screen.findByRole('alertdialog');
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

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Prompt')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'OK' })).toBeInTheDocument();

    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Cancel' }));
  });
});
