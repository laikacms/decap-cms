import { describe, expect, it } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { editorStateToSource, sourceToEditorState } from '@/lib/richtext/bridge/source';
import { registerMapper } from '@/lib/richtext/registry';

registerMapper(markdownMapper);

describe('editorStateToSource / sourceToEditorState', () => {
  it('round-trips markdown source through the editor state', () => {
    const markdown = '# Title\n\nSome **bold** text\n\n- item one\n- item two';
    const state = sourceToEditorState(markdown, 'markdown');
    const back = editorStateToSource(state, 'markdown');
    expect(back).toContain('# Title');
    expect(back).toContain('**bold**');
    expect(back).toContain('- item one');
  });

  it('serializes custom blocks the markdown grammar cannot express as visible JSON fences', () => {
    const state = sourceToEditorState('hello', 'markdown');
    const root = (state as unknown as { root: { children: unknown[] } }).root;
    root.children.push({
      type: 'decap-block',
      version: 1,
      componentId: 'youtube',
      data: { url: 'https://youtu.be/x' },
    });

    // The markdown mapper has no syntax for arbitrary custom blocks; its
    // fallback is a ```json fence of the PT object, visible in the source
    // view rather than silently dropped. A format with its own mapper is
    // expected to define a real encoding for its blocks instead.
    const source = editorStateToSource(state, 'markdown');
    expect(source).toContain('```json');
    expect(source).toContain('"_type": "youtube"');
  });

  it('throws for an unregistered format', () => {
    expect(() => sourceToEditorState('x', 'no-such-format')).toThrow(/no mapper registered/);
  });
});
