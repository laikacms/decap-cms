import { render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { markdownFormat } from '@/format-packs/markdown';
import {
  registerBlock,
  registerFormat,
  registerMapper,
  unregisterBlock,
  unregisterFormat,
  unregisterMapper,
} from '@/lib/richtext';
import { createLexicalRichtextValue } from '@/lib/richtext/lexical';
import { portableTextMapper } from '@/lib/richtext/portable-text-mapper';
import { Editor } from '@/ui/editor';
import { LexicalControl } from '@/widgets/richtext/widget/control';

import type { BlockDefinition } from '@/lib/richtext';
import type { CmsFieldBase } from '@/lib/util/index';
import type { CmsFieldRichtext } from '@/lib/util/types/cms/fields/richtext';
import type { SerializedEditorState } from 'lexical';

// `Editor` itself is a full Lexical composer; mounting the real thing would
// make this a browser-integration test instead of a unit test of the widget
// layer's value-shape coercion and format/blocks resolution. Mock it and
// inspect the props `LexicalControl` threads through.
vi.mock('@/ui/editor', () => ({
  Editor: vi.fn(() => null),
  EditorGlobalStyles: () => null,
}));

type DecapField = CmsFieldRichtext & CmsFieldBase;

const baseField: DecapField = {
  widget: 'richtext',
  name: 'body',
};

function lastEditorProps() {
  const calls = vi.mocked(Editor).mock.calls;
  const call = calls[calls.length - 1];
  if (!call) throw new Error('Editor was never rendered');
  return call[0];
}

interface LooseLexicalNode {
  text?: string;
  children?: LooseLexicalNode[];
}

/** Collect every text-node `text` in a serialized editor state, in order. */
function flattenText(state?: SerializedEditorState): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const casted = node as LooseLexicalNode;
    if (typeof casted.text === 'string') parts.push(casted.text);
    if (Array.isArray(casted.children)) casted.children.forEach(walk);
  };
  walk(state?.root);
  return parts.join(' ');
}

// A registered format is required for `createRichtextValue`/`getFormat` to
// resolve anything; `portableText` is the identity mapper nested block
// fields store their canonical value in.
beforeAll(() => {
  registerFormat(markdownFormat);
  registerMapper(portableTextMapper);
});

afterAll(() => {
  unregisterFormat('markdown');
  unregisterMapper('portableText');
});

afterEach(() => {
  vi.mocked(Editor).mockClear();
});

describe('LexicalControl', () => {
  describe('value shapes', () => {
    it('threads a raw string value through as parsed content', () => {
      render(
        <LexicalControl
          value="Hello **world**"
          field={baseField}
          onChange={vi.fn()}
        />,
      );

      const props = lastEditorProps();
      expect(props.format).toBe('markdown');
      expect(flattenText(props.editorSerializedState)).toContain('Hello');
      expect(flattenText(props.editorSerializedState)).toContain('world');
    });

    it('threads a live RichtextValue through unchanged (same instance, same editor state)', () => {
      const existing = createLexicalRichtextValue('Existing content', { hint: 'markdown' });
      const onChange = vi.fn();

      render(
        <LexicalControl
          value={existing}
          field={baseField}
          onChange={onChange}
        />,
      );

      const props = lastEditorProps();
      expect(props.editorSerializedState).toBe(existing.editorState);
      expect(props.format).toBe(existing.outputFormat);

      // A change from the editor must flow back onto the *same* proxy
      // instance that was passed in, not a freshly constructed one.
      const nextState = { root: { children: [] } } as unknown as SerializedEditorState;
      props.onSerializedChange?.(nextState);
      expect(onChange).toHaveBeenCalledWith(existing);
      expect(existing.editorState).toBe(nextState);
    });

    it('threads a Portable Text array (nested block field) through the portableText mapper, not markdown', () => {
      const portableTextValue = [
        {
          _type: 'block',
          _key: 'blk1',
          style: 'normal',
          children: [{ _type: 'span', _key: 'span1', text: 'Nested body', marks: [] }],
        },
      ];

      render(
        <LexicalControl
          value={portableTextValue}
          field={baseField}
          onChange={vi.fn()}
        />,
      );

      const props = lastEditorProps();
      // No explicit `field.format`, so the array branch must force the
      // `portableText` hint rather than falling through to markdown.
      expect(props.format).toBe('portableText');
      expect(flattenText(props.editorSerializedState)).toContain('Nested body');
    });
  });

  describe('field.format resolution via getFormat', () => {
    it('resolves the field-format lexical extras and threads them to the editor', () => {
      render(
        <LexicalControl
          value="plain text"
          field={{ ...baseField, format: 'markdown' }}
          onChange={vi.fn()}
        />,
      );

      const props = lastEditorProps();
      expect(props.format).toBe('markdown');
      expect(props.extensions).toBe(markdownFormat.lexical);
    });

    it('leaves extensions undefined when the resolved format has no registered pack', () => {
      // A format id detected/hinted but never registered via `registerFormat`
      // (only `registerMapper`) has no `FormatPack`, so `getFormat` misses.
      registerMapper({
        id: 'unpacked',
        label: 'Unpacked',
        detect: () => 0,
        toPortableText: raw => JSON.parse(raw) as [],
        fromPortableText: doc => JSON.stringify(doc),
      });

      try {
        render(
          <LexicalControl
            value="plain text"
            field={{ ...baseField, format: 'unpacked' }}
            onChange={vi.fn()}
          />,
        );

        const props = lastEditorProps();
        expect(props.format).toBe('unpacked');
        expect(props.extensions).toBeUndefined();
      } finally {
        unregisterMapper('unpacked');
      }
    });
  });

  describe('field.blocks resolution via resolveBlocksForField', () => {
    const noteDef: BlockDefinition = { id: 'note', label: 'Note', fields: [] };
    const asideDef: BlockDefinition = { id: 'aside', label: 'Aside', fields: [] };

    it('exposes every registered block when the field has no allowlist', () => {
      registerBlock(noteDef);
      registerBlock(asideDef);

      try {
        render(
          <LexicalControl
            value="plain text"
            field={baseField}
            onChange={vi.fn()}
          />,
        );

        const props = lastEditorProps();
        expect(props.blocksConfig?.blocks).toEqual({ note: noteDef, aside: asideDef });
      } finally {
        unregisterBlock('note');
        unregisterBlock('aside');
      }
    });

    it('restricts blocks to the field.blocks allowlist', () => {
      registerBlock(noteDef);
      registerBlock(asideDef);

      try {
        render(
          <LexicalControl
            value="plain text"
            field={{ ...baseField, blocks: ['note'] }}
            onChange={vi.fn()}
          />,
        );

        const props = lastEditorProps();
        expect(props.blocksConfig?.blocks).toEqual({ note: noteDef });
      } finally {
        unregisterBlock('note');
        unregisterBlock('aside');
      }
    });
  });
});
