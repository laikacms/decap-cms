import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClearEditorActionPlugin } from './ClearEditorPlugin';

const dispatchCommand = vi.fn();

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [{ dispatchCommand }],
}));

const TITLE = 'Clear Editor';
const DESCRIPTION = 'Are you sure you want to clear the editor?';

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Clear editor' }));
  return screen.findByRole('dialog');
}

describe('ClearEditorActionPlugin', () => {
  beforeEach(() => {
    dispatchCommand.mockClear();
  });

  it('does not show the dialog before the trigger is clicked', () => {
    render(<ClearEditorActionPlugin />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dispatchCommand).not.toHaveBeenCalled();
  });

  it('opens the confirm dialog on trigger click without dispatching', async () => {
    render(<ClearEditorActionPlugin />);
    const dialog = await openDialog();
    expect(dialog).toBeTruthy();
    expect(dispatchCommand).not.toHaveBeenCalled();
  });

  it('shows the title and description', async () => {
    render(<ClearEditorActionPlugin />);
    const dialog = await openDialog();
    expect(dialog.textContent).toContain(TITLE);
    expect(dialog.textContent).toContain(DESCRIPTION);
  });

  it('closes without dispatching on Cancel', async () => {
    render(<ClearEditorActionPlugin />);
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(dispatchCommand).not.toHaveBeenCalled();
  });

  it('dispatches CLEAR_EDITOR_COMMAND once with undefined and closes on Clear', async () => {
    render(<ClearEditorActionPlugin />);
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(dispatchCommand).toHaveBeenCalledTimes(1);
    expect(dispatchCommand).toHaveBeenCalledWith(CLEAR_EDITOR_COMMAND, undefined);
  });
});
