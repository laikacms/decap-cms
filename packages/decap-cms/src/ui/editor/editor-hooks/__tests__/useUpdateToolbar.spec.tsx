import { renderHook } from '@testing-library/react';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_LOW,
  createEditor,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { describe, expect, it, vi } from 'vitest';

import { ToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { useUpdateToolbarHandler } from '@/ui/editor/editor-hooks/useUpdateToolbar';

import type { ReactNode } from 'react';

function createEmptyEditor(): LexicalEditor {
  return createEditor({
    onError: e => {
      throw e;
    },
  });
}

function createEditorWithSelection(): LexicalEditor {
  const editor = createEmptyEditor();
  editor.update(
    () => {
      const text = $createTextNode('hello');
      $getRoot().append($createParagraphNode().append(text));
      text.select();
    },
    { discrete: true },
  );
  return editor;
}

function wrapperFor(editor: LexicalEditor) {
  return function Wrapper({ children }: { children?: ReactNode }) {
    return (
      <ToolbarContext
        activeEditor={editor}
        blockType="paragraph"
        setBlockType={() => {}}
        showModal={() => {}}
        $updateToolbar={() => {}}
      >
        {children}
      </ToolbarContext>
    );
  };
}

describe('useUpdateToolbarHandler', () => {
  it('invokes the callback on mount with the current selection', () => {
    const editor = createEditorWithSelection();
    const callback = vi.fn();

    renderHook(() => useUpdateToolbarHandler(callback), { wrapper: wrapperFor(editor) });

    expect(callback).toHaveBeenCalledTimes(1);
    const selection = callback.mock.calls[0][0];
    expect(selection).toBeTruthy();
    expect(typeof selection.isCollapsed).toBe('function');
  });

  it('does not invoke the callback on mount when selection is null', () => {
    const editor = createEmptyEditor();
    const callback = vi.fn();

    renderHook(() => useUpdateToolbarHandler(callback), { wrapper: wrapperFor(editor) });

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not invoke the callback on SELECTION_CHANGE_COMMAND when selection is null', () => {
    const editor = createEmptyEditor();
    const callback = vi.fn();
    renderHook(() => useUpdateToolbarHandler(callback), { wrapper: wrapperFor(editor) });

    editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

    expect(callback).not.toHaveBeenCalled();
  });

  it('invokes the callback on SELECTION_CHANGE_COMMAND and returns false so other listeners fire', () => {
    const editor = createEditorWithSelection();
    const callback = vi.fn();
    const otherListener = vi.fn(() => false);
    editor.registerCommand(SELECTION_CHANGE_COMMAND, otherListener, COMMAND_PRIORITY_LOW);
    renderHook(() => useUpdateToolbarHandler(callback), { wrapper: wrapperFor(editor) });
    callback.mockClear();

    const handled = editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(otherListener).toHaveBeenCalledTimes(1);
    expect(handled).toBe(false);
  });

  it('uses the latest callback after re-render without re-registering the command', () => {
    const editor = createEditorWithSelection();
    const registerSpy = vi.spyOn(editor, 'registerCommand');
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(({ cb }) => useUpdateToolbarHandler(cb), {
      wrapper: wrapperFor(editor),
      initialProps: { cb: first },
    });
    expect(registerSpy).toHaveBeenCalledTimes(1);
    first.mockClear();

    rerender({ cb: second });
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('unregisters the command listener on unmount', () => {
    const editor = createEditorWithSelection();
    const callback = vi.fn();
    const { unmount } = renderHook(() => useUpdateToolbarHandler(callback), {
      wrapper: wrapperFor(editor),
    });
    callback.mockClear();

    unmount();
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

    expect(callback).not.toHaveBeenCalled();
  });
});
