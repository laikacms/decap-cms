import { createEmptyEditorState } from './empty';
import { decoratorsToFormat, isDecorator } from './marks';

import type {
  PortableTextBlock,
  PortableTextDocument,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@/lib/richtext/portable-text';
import type { SerializedEditorState } from 'lexical';

/** Loose serialized-node shape; the whole tree is cast to Lexical types at the end. */
type Lex = Record<string, any>;

const HEADING_STYLES = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function textNode(text: string, format: number): Lex {
  return { type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '' };
}

function lineBreak(): Lex {
  return { type: 'linebreak', version: 1 };
}

function element(type: string, children: Lex[], extra: Lex = {}): Lex {
  return { type, version: 1, children, direction: null, format: '', indent: 0, ...extra };
}

/** Split text on `\n` into text nodes interleaved with linebreak nodes. */
function inlineFromText(text: string, format: number): Lex[] {
  const parts = text.split('\n');
  const nodes: Lex[] = [];
  parts.forEach((part, index) => {
    if (index > 0) nodes.push(lineBreak());
    if (part !== '' || parts.length === 1) nodes.push(textNode(part, format));
  });
  return nodes;
}

function isSpan(child: unknown): child is PortableTextSpan {
  return !!child && typeof child === 'object' && (child as { _type?: string })._type === 'span';
}

/** Convert one span into inline Lexical nodes (a link node, or bare text nodes). */
function spanToInline(span: PortableTextSpan, markDefs: PortableTextMarkDefinition[]): Lex[] {
  const marks = span.marks ?? [];
  const format = decoratorsToFormat(marks.filter(isDecorator));
  const inline = inlineFromText(span.text ?? '', format);

  const annotationKey = marks.find(mark => !isDecorator(mark));
  if (annotationKey) {
    const def = markDefs.find(markDef => markDef._key === annotationKey);
    if (def && def._type === 'link' && typeof def.href === 'string') {
      return [
        element('link', inline, {
          url: def.href,
          rel: typeof def.rel === 'string' ? def.rel : null,
          target: typeof def.target === 'string' ? def.target : null,
          title: typeof def.title === 'string' ? def.title : null,
        }),
      ];
    }
  }
  return inline;
}

/** Convert a PT inline object (non-span child of a text block) to a Lexical node. */
function inlineObjectToLexical(child: Record<string, unknown>): Lex {
  const { _type, _key, ...data } = child;
  return {
    type: 'decap-inline-block',
    version: 1,
    componentId: String(_type),
    data,
    // Preserve the PT `_key` so the object keeps its identity across the
    // editor round-trip (stable keys are the diff/identity primitive).
    ...(typeof _key === 'string' ? { blockKey: _key } : {}),
  };
}

/** Inline children of a text block: spans plus inline custom objects. */
function blockChildren(block: PortableTextBlock): Lex[] {
  const markDefs = block.markDefs ?? [];
  const children: Lex[] = [];
  for (const child of block.children ?? []) {
    if (isSpan(child)) {
      children.push(...spanToInline(child, markDefs));
    } else if (child && typeof child === 'object' && typeof child._type === 'string') {
      children.push(inlineObjectToLexical(child));
    }
  }
  return children;
}

/** Convert a code block (`{_type:'code', code, language}`) to a Lexical code node. */
function codeNode(obj: Record<string, unknown>): Lex {
  const code = typeof obj.code === 'string' ? obj.code : '';
  const language = typeof obj.language === 'string' ? obj.language : null;
  return element('code', inlineFromText(code, 0), { language });
}

/**
 * Convert a PT image block (`{_type:'image', src, alt}`) to a Lexical
 * `ImageNode`. Consent is re-derived from `src` rather than trusted from
 * storage: `data:` sources are self-contained, http(s)/relative sources
 * still need a live fetch, so gate those behind the same consent the
 * paste-time path applies (`$convertImageElement`, DCMS-640 / DCMS-1166).
 */
function imageNode(obj: Record<string, unknown>): Lex {
  const src = typeof obj.src === 'string' ? obj.src : '';
  const alt = typeof obj.alt === 'string' ? obj.alt : '';
  return {
    type: 'image',
    version: 1,
    src,
    altText: alt,
    maxWidth: 500,
    requiresConsent: !/^data:/i.test(src),
  };
}

/** Convert a PT horizontal-rule block to a Lexical horizontal-rule node. */
function horizontalRuleNode(): Lex {
  return { type: 'horizontalrule', version: 1 };
}

/** Convert an arbitrary custom object to a Lexical BlockNode. */
function customBlockNode(obj: Record<string, unknown>): Lex {
  const { _type, _key, ...data } = obj;
  return {
    type: 'decap-block',
    version: 1,
    componentId: String(_type),
    data,
    // Preserve the PT `_key` so the block keeps its identity across the
    // editor round-trip (stable keys are the diff/identity primitive).
    ...(typeof _key === 'string' ? { blockKey: _key } : {}),
  };
}

/** One table cell's PT blocks as Lexical children (min. one paragraph). */
function tableCellChildren(cell: Record<string, unknown>): Lex[] {
  const blocks = Array.isArray(cell.value) ? cell.value : [];
  const children: Lex[] = [];
  for (const block of blocks) {
    if (block && typeof block === 'object' && (block as { _type?: string })._type === 'block') {
      children.push(textBlockToLexical(block as PortableTextBlock));
    }
  }
  if (children.length === 0) {
    children.push(element('paragraph', [], { textFormat: 0, textStyle: '' }));
  }
  return children;
}

/**
 * Convert a PT table (`{_type:'table', headerRows?, rows}` — the shape the
 * markdown mapper emits) to a Lexical table node tree.
 */
function tableNode(obj: Record<string, unknown>): Lex {
  const headerRows = typeof obj.headerRows === 'number' ? obj.headerRows : 0;
  const rows = Array.isArray(obj.rows) ? obj.rows : [];
  return element(
    'table',
    rows.map((row, rowIndex) => {
      const cells = Array.isArray((row as { cells?: unknown[] })?.cells)
        ? ((row as { cells: unknown[] }).cells as Array<Record<string, unknown>>)
        : [];
      return element(
        'tablerow',
        cells.map(cell =>
          element('tablecell', tableCellChildren(cell), {
            headerState: rowIndex < headerRows ? 1 : 0,
            colSpan: 1,
            rowSpan: 1,
          })
        ),
      );
    }),
  );
}

/** Convert a non-list text block to its Lexical element node. */
function textBlockToLexical(block: PortableTextBlock): Lex {
  const children = blockChildren(block);
  const style = block.style ?? 'normal';
  if (style === 'blockquote') return element('quote', children);
  if (HEADING_STYLES.has(style)) {
    return element('heading', children, { tag: style });
  }
  return element('paragraph', children, { textFormat: 0, textStyle: '' });
}

function isListBlock(value: unknown): value is PortableTextBlock {
  return (
    !!value
    && typeof value === 'object'
    && (value as { _type?: string })._type === 'block'
    && typeof (value as { listItem?: unknown }).listItem === 'string'
  );
}

function listNode(listType: string): Lex {
  return element('list', [], {
    listType,
    start: 1,
    tag: listType === 'number' ? 'ol' : 'ul',
  });
}

function listItemNode(children: Lex[], value: number): Lex {
  return element('listitem', children, { value });
}

/**
 * Group a run of consecutive Portable Text list blocks into nested Lexical
 * lists, using each block's 1-based `level`.
 */
function buildLists(run: PortableTextBlock[]): Lex[] {
  const roots: Lex[] = [];
  const stack: Array<{ level: number, list: Lex }> = [];

  for (const block of run) {
    const level = typeof block.level === 'number' && block.level > 0 ? block.level : 1;
    const listType = block.listItem === 'number' ? 'number' : 'bullet';

    while (stack.length > 0 && stack[stack.length - 1]!.level > level) stack.pop();

    let top = stack[stack.length - 1];
    if (!top || top.level < level) {
      const list = listNode(listType);
      if (top) {
        const parentItems = top.list.children as Lex[];
        const lastItem = parentItems[parentItems.length - 1];
        if (lastItem) (lastItem.children as Lex[]).push(list);
        else parentItems.push(listItemNode([list], 1));
      } else {
        roots.push(list);
      }
      top = { level, list };
      stack.push(top);
    } else if (top.list.listType !== listType) {
      // Same depth but the marker kind changed — start a sibling list.
      const list = listNode(listType);
      if (stack.length > 1) {
        const parentItems = stack[stack.length - 2]!.list.children as Lex[];
        const lastItem = parentItems[parentItems.length - 1];
        if (lastItem) (lastItem.children as Lex[]).push(list);
      } else {
        roots.push(list);
      }
      stack[stack.length - 1] = { level, list };
      top = stack[stack.length - 1]!;
    }

    const items = top.list.children as Lex[];
    items.push(listItemNode(blockChildren(block), items.length + 1));
  }

  return roots;
}

/**
 * Convert a Portable Text document into a Lexical `SerializedEditorState`.
 */
export function portableTextToLexical(doc: PortableTextDocument): SerializedEditorState {
  const children: Lex[] = [];
  const blocks = Array.isArray(doc) ? doc : [];

  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index]!;
    if (isListBlock(block)) {
      const run: PortableTextBlock[] = [];
      while (index < blocks.length && isListBlock(blocks[index])) {
        run.push(blocks[index] as PortableTextBlock);
        index += 1;
      }
      children.push(...buildLists(run));
      continue;
    }

    const type = (block as { _type?: string })._type;
    if (type === 'block') {
      children.push(textBlockToLexical(block as PortableTextBlock));
    } else if (type === 'code') {
      children.push(codeNode(block as Record<string, unknown>));
    } else if (type === 'table') {
      children.push(tableNode(block as Record<string, unknown>));
    } else if (type === 'image') {
      children.push(imageNode(block as Record<string, unknown>));
    } else if (type === 'horizontal-rule') {
      children.push(horizontalRuleNode());
    } else if (typeof type === 'string') {
      children.push(customBlockNode(block as Record<string, unknown>));
    }
    index += 1;
  }

  if (children.length === 0) return createEmptyEditorState();

  return {
    root: { type: 'root', version: 1, format: '', indent: 0, direction: null, children },
  } as unknown as SerializedEditorState;
}
