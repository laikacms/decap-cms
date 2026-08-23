import remarkParse from 'remark-parse';
import unified from 'unified';
import { describe, expect, it, vi } from 'vitest';

import { remarkParseShortcodes } from '@/widgets/richtext/serializers/remarkShortcodes';

import type {
  EditorComponent,
  EditorComponentsRegistry,
  MdastNode,
  MdastRoot,
  ShortcodeData,
} from '@/widgets/richtext/types';

function process(value: string, plugins: EditorComponentsRegistry) {
  return unified()
    .use(remarkParse, { fences: true, commonmark: true })
    .use(remarkParseShortcodes, { plugins })
    .parse<MdastRoot>(value);
}

interface TestComponentOptions {
  id?: string;
  fromBlock?: (match: RegExpMatchArray) => ShortcodeData;
  pattern: RegExp;
}

function editorComponent({
  id = 'foo',
  fromBlock = vi.fn(() => ({})),
  pattern,
}: TestComponentOptions): EditorComponent {
  return {
    id,
    label: id,
    type: 'shortcode',
    icon: 'exclamation-triangle',
    widget: 'object',
    fields: [],
    toBlock: () => '',
    fromBlock,
    pattern,
  };
}

function registry(...components: EditorComponent[]): EditorComponentsRegistry {
  return new Map(components.map(component => [component.id, component]));
}

/** Strip remark's source positions so trees can be compared structurally. */
function removePositions(node: MdastNode): MdastNode {
  const { position: _position, ...rest } = node;
  return rest.children ? { ...rest, children: rest.children.map(removePositions) } : rest;
}

describe('remarkParseShortcodes', () => {
  describe('pattern matching', () => {
    it('should match multiline shortcodes', () => {
      const fromBlock = vi.fn(() => ({}));
      const component = editorComponent({ pattern: /^foo\nbar$/, fromBlock });
      process('foo\nbar', registry(component));
      expect(fromBlock).toHaveBeenCalledWith(expect.arrayContaining(['foo\nbar']));
    });

    it('should match multiline shortcodes with empty lines', () => {
      const fromBlock = vi.fn(() => ({}));
      const component = editorComponent({ pattern: /^foo\n\nbar$/, fromBlock });
      process('foo\n\nbar', registry(component));
      expect(fromBlock).toHaveBeenCalledWith(expect.arrayContaining(['foo\n\nbar']));
    });

    it('should match shortcodes by first matching plugin', () => {
      const barFromBlock = vi.fn(() => ({}));
      const fooComponent = editorComponent({ id: 'foo', pattern: /^foo/ });
      const barComponent = editorComponent({
        id: 'bar',
        pattern: /^bar/,
        fromBlock: barFromBlock,
      });
      process('bar\n\nfoo', registry(fooComponent, barComponent));
      // 'bar' is the first block, but 'foo' plugin is first in registry.
      // 'foo' doesn't match 'bar', so 'bar' plugin matches.
      expect(barFromBlock).toHaveBeenCalledWith(expect.arrayContaining(['bar']));
    });

    it('should warn when pattern uses multiline flag', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const component = editorComponent({ pattern: /^foo$/m });
      process('foo', registry(component));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('must not use the multiline flag'),
      );
      warnSpy.mockRestore();
    });
  });

  describe('parse', () => {
    const shortcodeNode = (bar: string): MdastNode => ({
      type: 'shortcode',
      data: { shortcode: 'foo', shortcodeData: { bar } },
    });

    const paragraph = (value: string): MdastNode => ({
      type: 'paragraph',
      children: [{ type: 'text', value }],
    });

    function fromGroups(match: RegExpMatchArray): ShortcodeData {
      return { bar: match.groups?.bar };
    }

    describe('pattern with leading caret', () => {
      it('should be a remark shortcode node', () => {
        const component = editorComponent({
          pattern: /^foo (?<bar>.+)$/,
          fromBlock: fromGroups,
        });
        const mdast = process('foo baz', registry(component));
        expect(removePositions(mdast)).toEqual({
          type: 'root',
          children: [shortcodeNode('baz')],
        });
      });

      it('should parse multiple shortcodes', () => {
        const component = editorComponent({
          pattern: /foo (?<bar>.+)/,
          fromBlock: fromGroups,
        });
        const mdast = process('paragraph\n\nfoo bar\n\nfoo baz\n\nnext para', registry(component));
        expect(removePositions(mdast)).toEqual({
          type: 'root',
          children: [
            paragraph('paragraph'),
            shortcodeNode('bar'),
            shortcodeNode('baz'),
            paragraph('next para'),
          ],
        });
      });
    });

    describe('pattern without leading caret', () => {
      it('should handle pattern without leading caret', () => {
        const component = editorComponent({
          pattern: /foo (?<bar>.+)/,
          fromBlock: fromGroups,
        });
        const mdast = process('paragraph\n\nfoo baz', registry(component));
        expect(removePositions(mdast)).toEqual({
          type: 'root',
          children: [paragraph('paragraph'), shortcodeNode('baz')],
        });
      });

      it('should parse multiple shortcodes', () => {
        const component = editorComponent({
          pattern: /foo (?<bar>.+)/,
          fromBlock: fromGroups,
        });
        const mdast = process('paragraph\n\nfoo bar\n\nfoo baz\n\nnext para', registry(component));
        expect(removePositions(mdast)).toEqual({
          type: 'root',
          children: [
            paragraph('paragraph'),
            shortcodeNode('bar'),
            shortcodeNode('baz'),
            paragraph('next para'),
          ],
        });
      });
    });
  });
});
