import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { registerMapper } from '@/lib/richtext';
import { sourceToEditorState } from '@/lib/richtext/lexical';
import { Editor } from '@/ui/editor/Editor';

registerMapper(markdownMapper);

function editorText(): string {
  return document.querySelector('.ContentEditable__root')?.textContent ?? '';
}

describe('Editor mount', () => {
  // DCMS-654: opening an existing entry showed "UNSAVED CHANGES" before any
  // user input. Root cause: `AutoFocusExtension` focuses the editor on
  // mount, which fires a Lexical update tagged `'focus'`; `OnChangePlugin`
  // let that through as a real change, so `onSerializedChange` fired with
  // no user interaction and the draft's `hasChanged` flag flipped true.
  it('does not report a change from autofocus alone, with no user interaction', async () => {
    const onSerializedChange = vi.fn();
    const initial = sourceToEditorState(
      '# Hello\n\nSome **bold** text\n\n- one\n- two\n',
      'markdown',
    );

    render(
      <Editor
        editorSerializedState={initial}
        format="markdown"
        onSerializedChange={onSerializedChange}
      />,
    );

    await waitFor(() => expect(editorText()).toContain('Hello'));
    // Give any deferred/microtask-scheduled updates (autofocus, transforms)
    // a chance to flush before asserting nothing fired.
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(onSerializedChange).not.toHaveBeenCalled();
  });
});
