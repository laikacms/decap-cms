import {
  editorStateFromSerializedDocument,
  type SerializedDocument,
  serializedDocumentFromEditorState,
} from '@lexical/file';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CLEAR_HISTORY_COMMAND } from 'lexical';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docFromHash, docToHash } from '@/ui/editor/utils/doc-serialization';
import { addToast } from '@/ui/toastManager';
import { ShareContentPlugin } from './ShareContentPlugin';

const stubEditorState = vi.hoisted(() => ({ name: 'stub-editor-state' }));
const restoredEditorState = vi.hoisted(() => ({ name: 'restored-editor-state' }));
const stubEditor = vi.hoisted(() => ({
  setEditorState: vi.fn(),
  dispatchCommand: vi.fn(),
  getEditorState: vi.fn(),
}));

vi.mock('@lexical/file', () => ({
  editorStateFromSerializedDocument: vi.fn(),
  serializedDocumentFromEditorState: vi.fn(),
}));

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [stubEditor],
}));

vi.mock('@/ui/toastManager', () => ({ addToast: vi.fn() }));

const LABEL = 'Copy share link to current editor content';

function makeDoc(source: string): SerializedDocument {
  return { source, version: 1 } as unknown as SerializedDocument;
}

describe('ShareContentPlugin', () => {
  const writeText = vi.fn();

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    stubEditor.getEditorState.mockReturnValue(stubEditorState);
    vi.mocked(editorStateFromSerializedDocument).mockReturnValue(
      restoredEditorState as never,
    );
    vi.mocked(serializedDocumentFromEditorState).mockReturnValue(
      makeDoc('editor'),
    );
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('restore on mount', () => {
    it('sets editor state and clears history for an editor-source hash', async () => {
      const doc = makeDoc('editor');
      window.location.hash = await docToHash(doc);
      render(<ShareContentPlugin />);
      await waitFor(() => expect(stubEditor.setEditorState).toHaveBeenCalledTimes(1));
      expect(editorStateFromSerializedDocument).toHaveBeenCalledWith(stubEditor, doc);
      expect(stubEditor.setEditorState).toHaveBeenCalledWith(restoredEditorState);
      expect(stubEditor.dispatchCommand).toHaveBeenCalledTimes(1);
      expect(stubEditor.dispatchCommand).toHaveBeenCalledWith(
        CLEAR_HISTORY_COMMAND,
        undefined,
      );
    });

    it('is a no-op when the hash decodes to a non-editor source', async () => {
      window.location.hash = await docToHash(makeDoc('other'));
      render(<ShareContentPlugin />);
      await waitFor(() => expect(docFromHash(window.location.hash)).resolves.toBeTruthy());
      await Promise.resolve();
      expect(stubEditor.setEditorState).not.toHaveBeenCalled();
      expect(stubEditor.dispatchCommand).not.toHaveBeenCalled();
    });

    it('is a no-op when the hash is empty', async () => {
      render(<ShareContentPlugin />);
      await Promise.resolve();
      expect(stubEditor.setEditorState).not.toHaveBeenCalled();
      expect(stubEditor.dispatchCommand).not.toHaveBeenCalled();
    });
  });

  describe('share button', () => {
    it('exposes the aria-label', () => {
      render(<ShareContentPlugin />);
      expect(screen.getByRole('button', { name: LABEL })).toBeTruthy();
    });

    it('serializes the editor state with source "editor"', async () => {
      render(<ShareContentPlugin />);
      fireEvent.click(screen.getByLabelText(LABEL));
      await waitFor(() => expect(addToast).toHaveBeenCalled());
      expect(serializedDocumentFromEditorState).toHaveBeenCalledWith(
        stubEditorState,
        { source: 'editor' },
      );
    });

    it('updates the URL hash, writes it to the clipboard and toasts success', async () => {
      render(<ShareContentPlugin />);
      fireEvent.click(screen.getByLabelText(LABEL));
      await waitFor(() => expect(addToast).toHaveBeenCalledTimes(1));
      expect(window.location.hash).toMatch(/^#doc=.+/);
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText).toHaveBeenCalledWith(window.location.toString());
      await expect(docFromHash(window.location.hash)).resolves.toEqual(
        makeDoc('editor'),
      );
      expect(addToast).toHaveBeenCalledWith('URL copied to clipboard', 'success');
    });

    it('toasts an error when the clipboard write rejects', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      render(<ShareContentPlugin />);
      fireEvent.click(screen.getByLabelText(LABEL));
      await waitFor(() => expect(addToast).toHaveBeenCalledTimes(1));
      expect(addToast).toHaveBeenCalledWith(
        'URL could not be copied to clipboard',
        'error',
      );
    });
  });
});
