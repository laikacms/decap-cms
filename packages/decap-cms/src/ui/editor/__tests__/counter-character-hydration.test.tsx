import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { registerMapper } from '@/lib/richtext';
import { sourceToEditorState } from '@/lib/richtext/lexical';
import { Editor } from '@/ui/editor/Editor';

registerMapper(markdownMapper);

function counterText(): string {
  return document.body.textContent ?? '';
}

describe('CounterCharacterPlugin hydration (DCMS-1237)', () => {
  // Opening an existing entry whose body richtext already has content used to
  // show "0 characters | 0 words" in the footer until the user made their
  // first edit. Root cause: the counter's initial `useState` reads the
  // editor's text before `InitialStateExtension` finishes hydrating it (that
  // hydration commits via a microtask), and `registerTextContentListener`
  // only reports future edits, never the state it was registered against.
  it('seeds the counter from hydrated content, with no user edit', async () => {
    const initial = sourceToEditorState(
      'The post is number 18\n\nAnd this is yet another identical post body',
      'markdown',
    );

    render(<Editor editorSerializedState={initial} format="markdown" />);

    await waitFor(() => expect(counterText()).toContain('The post is number 18'));

    await waitFor(() => {
      expect(counterText()).toContain('66 characters');
      expect(counterText()).toContain('13 words');
    });
  });

  it('still shows zero counts for an empty document', async () => {
    render(<Editor format="markdown" />);

    await waitFor(() => {
      expect(counterText()).toContain('0 characters');
      expect(counterText()).toContain('0 words');
    });
  });
});
