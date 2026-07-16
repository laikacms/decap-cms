import { parseJsxAttributes } from '@/format-packs/mdx/attributes';

import type { ArbitraryTypedObject, PortableTextDocument, PortableTextSpan } from '@/lib/richtext';
import type {
  BlockContent,
  Blockquote,
  Definition,
  DefinitionContent,
  Heading,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
} from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

export interface MdastToPortableTextOptions {
  /** Deterministic `_key` source, shared with nested conversions. */
  keyGenerator(): string;
  /** The original MDX source, for verbatim slices of opaque nodes. */
  source: string;
  /**
   * Map a capitalized JSX element name to a PT `_type` (registered-block
   * name overrides). Defaults to identity.
   */
  resolveTypeForJsxName?(name: string): string;
}

/**
 * Convert an MDX mdast tree to Portable Text in the SAME dialect (including
 * `_key` generation order) as the markdown mapper's `@portabletext/markdown`
 * parse — pinned by the golden parity tests. On top of that dialect, MDX
 * constructs map per FORMAT_PACKS_PLAN.md:
 *
 * - Capitalized JSX (`<YouTube id="x"/>`) -> `{_type: 'YouTube', _key, id}`;
 *   JSX children -> a nested PT array on the `children` prop.
 * - Lowercase/dotted/fragment JSX, spread attributes -> opaque
 *   `{_type: 'mdx-jsx', value}` (verbatim source, round-trips untouched).
 * - Expressions -> `{_type: 'mdx-expression', value}` (no braces in `value`).
 * - Top-level `import`/`export` paragraphs -> `{_type: 'mdx-esm', value}`.
 */
export function mdastToPortableText(
  root: Root,
  options: MdastToPortableTextOptions,
): PortableTextDocument {
  return new Converter(options).convertRoot(root);
}

interface MarkDef {
  _key: string;
  _type: string;
  [key: string]: unknown;
}

/** A PT text block under construction. */
interface OpenBlock {
  _type: 'block';
  style: string;
  children: Array<PortableTextSpan | ArbitraryTypedObject>;
  _key: string;
  markDefs: MarkDef[];
  listItem?: string;
  level?: number;
  checked?: boolean;
}

const ESM_PATTERN = /^(import|export)\b/;

function isCapitalizedJsxName(name: string | null): name is string {
  return typeof name === 'string' && /^[A-Z][A-Za-z0-9]*$/.test(name);
}

class Converter {
  private readonly keyGenerator: () => string;
  private readonly source: string;
  private readonly resolveTypeForJsxName: (name: string) => string;

  /** Link-definition map for reference-style links/images. */
  private definitions = new Map<string, Definition>();

  private block: OpenBlock | null = null;
  /** Active marks: decorator names and link markDef `_key`s, outermost first. */
  private markStack: string[] = [];

  constructor(options: MdastToPortableTextOptions) {
    this.keyGenerator = options.keyGenerator;
    this.source = options.source;
    this.resolveTypeForJsxName = options.resolveTypeForJsxName ?? (name => name);
  }

  convertRoot(root: Root): PortableTextDocument {
    for (const node of root.children) {
      if (node.type === 'definition') this.definitions.set(node.identifier, node);
    }
    const doc: PortableTextDocument = [];
    this.convertFlow(root.children, doc, { atRoot: true, inBlockquote: false });
    return doc;
  }

  /** Verbatim source slice for an mdast node. */
  private slice(node: { position?: { start: { offset?: number }, end: { offset?: number } } }): string {
    const start = node.position?.start.offset ?? 0;
    const end = node.position?.end.offset ?? start;
    return this.source.slice(start, end);
  }

  // --- flow -----------------------------------------------------------------

  private convertFlow(
    nodes: Array<RootContent | BlockContent | DefinitionContent>,
    doc: PortableTextDocument,
    context: { atRoot: boolean, inBlockquote: boolean },
  ): void {
    for (const node of nodes) {
      switch (node.type) {
        case 'paragraph':
          this.convertParagraph(node, doc, context);
          break;
        case 'heading':
          this.convertHeading(node, doc);
          break;
        case 'blockquote':
          this.convertBlockquote(node, doc);
          break;
        case 'list':
          this.convertList(node, doc, 1);
          break;
        case 'code':
          doc.push({
            _key: this.keyGenerator(),
            _type: 'code',
            ...(node.lang
              ? { language: [node.lang, node.meta].filter(Boolean).join(' ') }
              : {}),
            code: node.value,
          });
          break;
        case 'thematicBreak':
          doc.push({ _key: this.keyGenerator(), _type: 'horizontal-rule' });
          break;
        case 'table':
          doc.push(this.convertTable(node));
          break;
        case 'mdxJsxFlowElement':
          doc.push(this.convertJsxElement(node, { inline: false }));
          break;
        case 'mdxFlowExpression':
          doc.push({ _key: this.keyGenerator(), _type: 'mdx-expression', value: node.value });
          break;
        case 'definition':
          break; // collected up front; emits nothing
        default:
          // html cannot occur (mdxMd disables it); anything else is dropped.
          break;
      }
    }
  }

  private convertParagraph(
    node: Paragraph,
    doc: PortableTextDocument,
    context: { atRoot: boolean, inBlockquote: boolean },
  ): void {
    // No-acorn ESM handling: a top-level import/export line parses as a plain
    // paragraph; keep it verbatim as an opaque `mdx-esm` block.
    if (context.atRoot) {
      const raw = this.slice(node);
      if (ESM_PATTERN.test(raw)) {
        doc.push({ _key: this.keyGenerator(), _type: 'mdx-esm', value: raw });
        return;
      }
    }

    // Dialect quirk: a paragraph whose sole child is an image becomes a
    // standalone image object — but the paragraph's block key is still
    // consumed first (and discarded).
    const only = node.children.length === 1 ? node.children[0] : undefined;
    if (only && (only.type === 'image' || only.type === 'imageReference')) {
      const resolved = this.resolveImage(only);
      if (resolved) {
        this.keyGenerator(); // burned paragraph block key
        doc.push({
          _key: this.keyGenerator(),
          _type: 'image',
          src: resolved.src,
          alt: resolved.alt,
          ...(resolved.title != null ? { title: resolved.title } : {}),
        });
        return;
      }
    }

    this.openBlock(context.inBlockquote ? 'blockquote' : 'normal');
    this.convertInline(node.children);
    this.closeBlock(doc);
  }

  private convertHeading(node: Heading, doc: PortableTextDocument): void {
    this.openBlock(`h${node.depth}`);
    this.convertInline(node.children);
    this.closeBlock(doc);
  }

  private convertBlockquote(node: Blockquote, doc: PortableTextDocument): void {
    this.convertFlow(node.children, doc, { atRoot: false, inBlockquote: true });
  }

  private convertList(node: List, doc: PortableTextDocument, level: number): void {
    for (const item of node.children) {
      this.convertListItem(item, doc, level, node.ordered ? 'number' : 'bullet');
    }
  }

  private convertListItem(
    item: ListItem,
    doc: PortableTextDocument,
    level: number,
    kind: 'number' | 'bullet',
  ): void {
    const isTask = item.checked != null;
    this.openBlock('normal');
    this.block!.listItem = isTask ? 'task' : kind;
    this.block!.level = level;
    if (isTask) this.block!.checked = item.checked === true;

    // All of the item's paragraphs flow into ONE block (matching markdown-it's
    // flat list handling — even loose items concatenate); nested lists and any
    // other flow content follow after the item's block.
    const rest: Array<BlockContent | DefinitionContent> = [];
    for (const child of item.children) {
      if (child.type === 'paragraph' && rest.length === 0) {
        this.convertInline(child.children);
      } else {
        rest.push(child);
      }
    }
    this.closeBlock(doc);

    for (const child of rest) {
      if (child.type === 'list') {
        this.convertList(child, doc, level + 1);
      } else {
        this.convertFlow([child], doc, { atRoot: false, inBlockquote: false });
      }
    }
  }

  private convertTable(node: Table): ArbitraryTypedObject {
    const align = node.align ?? [];
    const rows = node.children.map(row => {
      const cells = row.children.map(cell => {
        this.openBlock('normal');
        this.convertInline(cell.children);
        const cellBlocks: PortableTextDocument = [];
        this.closeBlock(cellBlocks);
        // Single-image cell unwrap: the cell's value is the image object
        // itself (the wrapping block's key stays consumed, like the
        // paragraph burn).
        const block = cellBlocks[0] as OpenBlock;
        const value = block.children.length === 1 && block.children[0]._type === 'image'
          ? [block.children[0]]
          : cellBlocks;
        return { _type: 'cell', _key: this.keyGenerator(), value };
      });
      return { _key: this.keyGenerator(), _type: 'row', cells };
    });
    return {
      _type: 'table',
      _key: this.keyGenerator(),
      rows,
      headerRows: 1,
      ...(align.some(a => a != null) ? { alignment: align } : {}),
    };
  }

  // --- JSX ------------------------------------------------------------------

  private convertJsxElement(
    node: MdxJsxFlowElement | MdxJsxTextElement,
    options: { inline: boolean },
  ): ArbitraryTypedObject {
    if (!isCapitalizedJsxName(node.name)) {
      return this.opaqueJsx(node);
    }
    const parsed = parseJsxAttributes(node.attributes);
    if (!parsed.ok) {
      return this.opaqueJsx(node);
    }

    // Claim the element's key before converting children (document order).
    const _key = this.keyGenerator();
    const _type = this.resolveTypeForJsxName(node.name);

    let children: PortableTextDocument | undefined;
    if (node.children.length > 0) {
      children = [];
      if (options.inline) {
        // Inline element children are phrasing content: wrap in one block.
        this.withFreshBlockState(() => {
          this.openBlock('normal');
          this.convertInline((node as MdxJsxTextElement).children);
          this.closeBlock(children!);
        });
      } else {
        this.convertFlow((node as MdxJsxFlowElement).children, children, {
          atRoot: false,
          inBlockquote: false,
        });
      }
    }

    return {
      ...parsed.data,
      ...(children && children.length > 0 ? { children } : {}),
      _type,
      _key,
    };
  }

  private opaqueJsx(node: MdxJsxFlowElement | MdxJsxTextElement): ArbitraryTypedObject {
    return { _key: this.keyGenerator(), _type: 'mdx-jsx', value: this.slice(node) };
  }

  /** Run `fn` with a clean block/mark state (for nested inline conversions). */
  private withFreshBlockState(fn: () => void): void {
    const previousBlock = this.block;
    const previousMarks = this.markStack;
    this.block = null;
    this.markStack = [];
    try {
      fn();
    } finally {
      this.block = previousBlock;
      this.markStack = previousMarks;
    }
  }

  // --- inline ---------------------------------------------------------------

  private convertInline(nodes: PhrasingContent[]): void {
    for (const node of nodes) {
      switch (node.type) {
        case 'text':
          this.addSpan(node.value);
          break;
        case 'emphasis':
          this.withMark('em', () => this.convertInline(node.children));
          break;
        case 'strong':
          this.withMark('strong', () => this.convertInline(node.children));
          break;
        case 'delete':
          this.withMark('strike-through', () => this.convertInline(node.children));
          break;
        case 'inlineCode':
          this.withMark('code', () => this.addSpan(node.value));
          break;
        case 'break':
          this.addSpan('\n');
          break;
        case 'link':
          this.convertLink(node.url, node.title, node.children);
          break;
        case 'linkReference': {
          const definition = this.definitions.get(node.identifier);
          if (definition) {
            this.convertLink(definition.url, definition.title, node.children);
          } else {
            this.convertInline(node.children);
          }
          break;
        }
        case 'image':
        case 'imageReference': {
          const resolved = this.resolveImage(node);
          if (resolved) {
            // Inline images never carry a title (dialect).
            this.block!.children.push({
              _key: this.keyGenerator(),
              _type: 'image',
              src: resolved.src,
              alt: resolved.alt,
            });
          }
          break;
        }
        case 'mdxJsxTextElement':
          this.block!.children.push(this.convertJsxElement(node, { inline: true }));
          break;
        case 'mdxTextExpression':
          this.block!.children.push({
            _key: this.keyGenerator(),
            _type: 'mdx-expression',
            value: node.value,
          });
          break;
        default:
          // html cannot occur; footnotes and other exotics are dropped.
          break;
      }
    }
  }

  private convertLink(
    url: string,
    title: string | null | undefined,
    children: PhrasingContent[],
  ): void {
    if (!url) {
      this.convertInline(children);
      return;
    }
    const markDef: MarkDef = {
      _key: this.keyGenerator(),
      _type: 'link',
      href: url,
      ...(title != null ? { title } : {}),
    };
    this.block!.markDefs.push(markDef);
    this.markStack.push(markDef._key);
    this.convertInline(children);
    this.markStack.pop();
  }

  private resolveImage(
    node: Extract<PhrasingContent, { type: 'image' | 'imageReference' }>,
  ): { src: string, alt: string, title: string | null | undefined } | null {
    if (node.type === 'image') {
      return { src: node.url, alt: node.alt ?? '', title: node.title };
    }
    const definition = this.definitions.get(node.identifier);
    if (!definition) return null;
    return { src: definition.url, alt: node.alt ?? '', title: definition.title };
  }

  // --- block state ----------------------------------------------------------

  private openBlock(style: string): void {
    this.block = {
      _type: 'block',
      style,
      children: [],
      _key: this.keyGenerator(),
      markDefs: [],
    };
  }

  private closeBlock(doc: PortableTextDocument): void {
    const block = this.block!;
    if (block.children.length === 0) {
      block.children.push({
        _type: 'span',
        _key: this.keyGenerator(),
        text: '',
        marks: [],
      });
    }
    this.block = null;
    doc.push(block as unknown as ArbitraryTypedObject);
  }

  private withMark(mark: string, fn: () => void): void {
    this.markStack.push(mark);
    fn();
    this.markStack.pop();
  }

  private addSpan(text: string): void {
    if (text.length === 0) return;
    const children = this.block!.children;
    const last = children[children.length - 1];
    if (
      last
      && last._type === 'span'
      && marksSetEqual((last as PortableTextSpan).marks ?? [], this.markStack)
    ) {
      (last as PortableTextSpan).text += text;
      return;
    }
    children.push({
      _type: 'span',
      _key: this.keyGenerator(),
      text,
      marks: [...this.markStack],
    });
  }
}

/** Set-equality on marks (order- and duplicate-insensitive), per the dialect. */
function marksSetEqual(a: string[], b: string[]): boolean {
  return a.every(mark => b.includes(mark)) && b.every(mark => a.includes(mark));
}
