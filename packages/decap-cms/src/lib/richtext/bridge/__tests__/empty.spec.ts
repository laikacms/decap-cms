import { describe, expect, it } from 'vitest';

import { createEmptyEditorState } from '@/lib/richtext/bridge/empty.js';

describe('richtext/bridge/empty', () => {
  describe('createEmptyEditorState', () => {
    it('returns a root node containing exactly one empty paragraph child', () => {
      const state = createEmptyEditorState();

      expect(state.root.children).toHaveLength(1);

      const [paragraph] = state.root.children as Array<Record<string, unknown>>;
      expect(paragraph.type).toBe('paragraph');
      expect(paragraph.children).toEqual([]);
    });

    it('matches the shape of Lexical SerializedEditorState for the root', () => {
      const state = createEmptyEditorState();

      expect(state.root.type).toBe('root');
      expect(state.root.version).toBe(1);
      expect(state.root.format).toBe('');
      expect(state.root.indent).toBe(0);
      expect(state.root.direction).toBeNull();
    });

    it('matches the shape of Lexical SerializedEditorState for the paragraph child', () => {
      const state = createEmptyEditorState();
      const [paragraph] = state.root.children as Array<Record<string, unknown>>;

      expect(paragraph).toMatchObject({
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        direction: null,
        textFormat: 0,
        textStyle: '',
        children: [],
      });
    });

    it('returns a fresh object on each call', () => {
      const a = createEmptyEditorState();
      const b = createEmptyEditorState();

      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });
});
