
import { createKeyGenerator } from '@/lib/richtext/keys';
import { formatToDecorators } from './marks';

import type {
  PortableTextBlock,
  PortableTextDocument,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@/lib/richtext/portable-text';
import type { SerializedEditorState } from 'lexical';

/** Loose serialized-node shape; the incoming editor state is untyped here. */
type Lex = Record<string, any>;

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

interface KeyGens {
  block: () => string;
  span: () => string;
  mark: () => string;
}

/**
 * Collapse a list of inline Lexical nodes (text, linebreak, tab, link) into
 * Portable Text spans, appending any discovered link annotations to `markDefs`.
 */
function collectSpans(
  nodes: Lex[],
  markDefs: PortableTextMarkDefinition[],
  keys: KeyGens,
): PortableTextSpan[] {
  const spans: PortableTextSpan[] = [];
  let current: { text: string, marks: string[], marksKey: string } | null = null;

  const flush = (): void => {
    if (!current) return;
    spans.push({ _type: 'span', _key: keys.span(), text: current.text, marks: current.marks });
    current = null;
  };

  const emit = (text: string, format: number, linkKey: string | undefined): void => {
    const decorators = formatToDecorators(format);
    const marks = linkKey ? [...decorators, linkKey] : decorators;
    const marksKey = marks.join('\u0000');
    if (current && current.marksKey === marksKey) {
      current.text += text;
    } else {
      flush();
      current = { text, marks, marksKey };
    }
  };

  const emitBreak = (linkKey: string | undefined): void => {
    if (current) {
      current.text += '\n';
    } else {
      const marks = linkKey ? [linkKey] : [];
      current = { text: '\n', marks, marksKey: marks.join('\u0000') };
    }
  };

  const walk = (list: Lex[], linkKey: string | undefined): void => {
    for (const node of list) {
      switch (node.type) {
        case 'text':
          emit(typeof node.text === 'string' ? node.text : '', node.format ?? 0, linkKey);
          break;
        case 'tab':
          emit('\t', node.format ?? 0, linkKey);
          break;
        case 'linebreak':
          emitBreak(linkKey);
          break;
        case 'link':
        case 'autolink': {
          flush();
          const key = keys.mark();
          markDefs.push({
            _type: 'link',
            _key: key,
            href: typeof node.url === 'string' ? node.url : '',
          });
          walk(Array.isArray(node.children) ? node.children : [], key);
          flush();
          break;
        }
        case 'overflow':
          // `CharacterLimitPlugin` wraps text past its limit in an OverflowNode
          // purely for decorative (over-limit) styling; it carries no semantic
          // meaning of its own, so its children serialize as if unwrapped.
          walk(Array.isArray(node.children) ? node.children : [], linkKey);
          break;
        default:
          break;
      }
    }
  };

  walk(nodes, undefined);
  flush();
  return spans;
}

/** Gather the plain-text content of a Lexical code node. */
function codeText(node: Lex): string {
  let text = '';
  for (const child of Array.isArray(node.children) ? node.children : []) {
    if (child.type === 'linebreak') text += '\n';
    else if (typeof child.text === 'string') text += child.text;
  }
  return text;
}

/** Flatten a Lexical list node into level-tagged Portable Text list blocks. */
function flattenList(node: Lex, level: number, out: PortableTextDocument, keys: KeyGens): void {
  const listItem = node.listType === 'number' ? 'number' : 'bullet';
  for (const item of Array.isArray(node.children) ? node.children : []) {
    if (item.type !== 'listitem') continue;
    const children: Lex[] = Array.isArray(item.children) ? item.children : [];
    const nested = children.filter(child => child.type === 'list');
    const inline = children.filter(child => child.type !== 'list');

    if (inline.length > 0 || nested.length === 0) {
      const markDefs: PortableTextMarkDefinition[] = [];
      const spans = collectSpans(inline, markDefs, keys);
      out.push({
        _type: 'block',
        _key: keys.block(),
        style: 'normal',
        listItem,
        level,
        markDefs,
        children: spans,
      });
    }
    for (const child of nested) flattenList(child, level + 1, out, keys);
  }
}

/** Convert one non-list root node to a Portable Text block. */
function convertBlock(node: Lex, keys: KeyGens): PortableTextBlock | Record<string, unknown> | null {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
    case 'quote': {
      const markDefs: PortableTextMarkDefinition[] = [];
      const spans = collectSpans(Array.isArray(node.children) ? node.children : [], markDefs, keys);
      const style = node.type === 'quote'
        ? 'blockquote'
        : node.type === 'heading' && HEADING_TAGS.has(node.tag)
        ? node.tag
        : 'normal';
      return { _type: 'block', _key: keys.block(), style, markDefs, children: spans };
    }
    case 'code':
      return {
        _type: 'code',
        _key: keys.block(),
        code: codeText(node),
        language: typeof node.language === 'string' ? node.language : null,
      };
    case 'decap-block':
      return {
        _type: typeof node.componentId === 'string' ? node.componentId : 'unknown',
        _key: keys.block(),
        ...(node.data && typeof node.data === 'object' ? node.data : {}),
      };
    default:
      return null;
  }
}

/**
 * Convert a Lexical `SerializedEditorState` into a Portable Text document.
 */
export function lexicalToPortableText(state: SerializedEditorState): PortableTextDocument {
  const keys: KeyGens = {
    block: createKeyGenerator('b'),
    span: createKeyGenerator('s'),
    mark: createKeyGenerator('m'),
  };
  const out: PortableTextDocument = [];
  const root = (state as unknown as { root?: Lex }).root;
  const children: Lex[] = root && Array.isArray(root.children) ? root.children : [];

  for (const node of children) {
    if (node.type === 'list') {
      flattenList(node, 1, out, keys);
      continue;
    }
    const block = convertBlock(node, keys);
    if (block) out.push(block as PortableTextBlock);
  }

  return out;
}
