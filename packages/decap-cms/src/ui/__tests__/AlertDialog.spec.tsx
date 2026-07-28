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
});
