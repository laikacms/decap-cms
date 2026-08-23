import { trimEnd } from 'lodash-es';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import rehypeRemoveComments from 'rehype-remove-comments';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import unified from 'unified';
import u from 'unist-builder';

import rehypePaperEmoji from './rehypePaperEmoji';
import remarkAllowHtmlEntities from './remarkAllowHtmlEntities';
import remarkAssertParents from './remarkAssertParents';
import remarkEscapeMarkdownEntities from './remarkEscapeMarkdownEntities';
import remarkPaddedLinks from './remarkPaddedLinks';
import remarkToRehypeShortcodes from './remarkRehypeShortcodes';
import { createRemarkShortcodeStringifier, remarkParseShortcodes } from './remarkShortcodes';
import remarkToSlate from './remarkSlate';
import remarkSquashReferences from './remarkSquashReferences';
import remarkStripTrailingBreaks from './remarkStripTrailingBreaks';
import remarkWrapHtml from './remarkWrapHtml';
import slateToRemark from './slateRemark';

import type {
  EditorComponentsRegistry,
  GetAssetFunction,
  MdastNode,
  MdastRoot,
  ResolveWidgetFunction,
  SlateNode,
} from '@/widgets/richtext/types';
import type { Pluggable, PluggableList, Processor } from 'unified';

/**
 * This module contains all serializers for the richtext widget.
 *
 * The value of a richtext widget is transformed to various formats during
 * editing, and these formats are referenced throughout serializer source
 * documentation. Below is brief glossary of the formats used.
 *
 * - Markdown {string}
 *   The stringified Markdown value. The value of the field is persisted
 *   (stored) in this format, and the stringified value is also used when the
 *   editor is in "raw" Markdown mode.
 *
 * - MDAST {object}
 *   Also loosely referred to as "Remark". MDAST stands for MarkDown AST
 *   (Abstract Syntax Tree), and is an object representation of a Markdown
 *   document. Underneath, it's a Unist tree with a Markdown-specific schema.
 *   MDAST syntax is a part of the Unified ecosystem, and powers the Remark
 *   processor, so Remark plugins may be used.
 *
 * - HAST {object}
 *   Also loosely referred to as "Rehype". HAST, similar to MDAST, is an object
 *   representation of an HTML document.  The field value takes this format
 *   temporarily before the document is stringified to HTML.
 *
 * - HTML {string}
 *   The field value is stringified to HTML for preview purposes - the HTML value
 *   is never parsed, it is output only.
 *
 * - Slate Raw AST {object}
 *   Slate's Raw AST is a very simple and unopinionated object representation of
 *   a document in a Slate editor. We define our own Markdown-specific schema
 *   for serialization to/from Slate's Raw AST and MDAST.
 */

const emptyEditorComponents: EditorComponentsRegistry = new Map();

/**
 * Remove named tokenizers from the parser, effectively deactivating them.
 */
function markdownToRemarkRemoveTokenizers(
  this: Processor,
  { inlineTokenizers }: { inlineTokenizers?: string[] },
) {
  const Parser = this.Parser;
  if (!Parser || !inlineTokenizers) return;

  inlineTokenizers.forEach(tokenizer => {
    delete Parser.prototype.inlineTokenizers[tokenizer];
  });
}

/**
 * Deserialize a Markdown string to an MDAST.
 */
export function markdownToRemark(
  markdown: string,
  remarkPlugins: PluggableList = [],
  editorComponents: EditorComponentsRegistry = emptyEditorComponents,
): MdastRoot {
  const processor = unified()
    .use(remarkParse, { fences: true, commonmark: true })
    .use(markdownToRemarkRemoveTokenizers, { inlineTokenizers: ['url'] })
    .use(remarkParseShortcodes, { plugins: editorComponents })
    .use(remarkAllowHtmlEntities)
    .use(remarkSquashReferences)
    .use(remarkPlugins);

  /**
   * Parse the Markdown string input to an MDAST.
   */
  const parsed = processor.parse<MdastRoot>(markdown);

  /**
   * Further transform the MDAST with plugins.
   */
  return processor.runSync<MdastRoot>(parsed);
}

/**
 * Serialize an MDAST to a Markdown string.
 */
export function remarkToMarkdown(
  obj: MdastNode | undefined,
  remarkPlugins: PluggableList = [],
  editorComponents: EditorComponentsRegistry = emptyEditorComponents,
): string {
  /**
   * Rewrite the remark-stringify text visitor to simply return the text value,
   * without encoding or escaping any characters. This means we're completely
   * trusting the markdown that we receive.
   */
  function remarkAllowAllText(this: Processor) {
    const Compiler = this.Compiler;
    if (!Compiler) return;
    Compiler.prototype.visitors.text = node => node.value ?? '';
  }

  /**
   * Provide an empty MDAST if no value is provided.
   */
  const mdast = obj ?? u<MdastNode>('root', [u<MdastNode>('p', [u<MdastNode>('text', '')])]);

  const remarkToMarkdownPluginOpts = {
    commonmark: true,
    fences: true,
    listItemIndent: '1',

    /**
     * Use asterisk for everything, it's the most versatile. Eventually using
     * other characters should be an option.
     */
    bullet: '*',
    emphasis: '*',
    strong: '*',
    rule: '-',
  };

  const processor = unified()
    .use({ settings: remarkToMarkdownPluginOpts })
    .use(remarkEscapeMarkdownEntities)
    .use(remarkStripTrailingBreaks)
    .use(remarkStringify)
    .use(remarkAllowAllText)
    .use(createRemarkShortcodeStringifier({ plugins: editorComponents }))
    .use(remarkPlugins);

  /**
   * Transform the MDAST with plugins.
   */
  const processedMdast = processor.runSync<MdastNode>(mdast);

  /**
   * Serialize the MDAST to markdown.
   */
  const markdown = processor.stringify(processedMdast).replace(/\r?/g, '');

  /**
   * Return markdown with trailing whitespace removed.
   */
  return trimEnd(markdown);
}

interface MarkdownToHtmlOptions {
  getAsset?: GetAssetFunction | undefined;
  resolveWidget?: ResolveWidgetFunction | undefined;
  remarkPlugins?: PluggableList | undefined;
  editorComponents?: EditorComponentsRegistry | undefined;
}

/**
 * Convert Markdown to HTML.
 */
export function markdownToHtml(
  markdown: string,
  {
    getAsset,
    resolveWidget,
    remarkPlugins = [],
    editorComponents = emptyEditorComponents,
  }: MarkdownToHtmlOptions = {},
): string {
  const mdast = markdownToRemark(markdown, remarkPlugins, editorComponents);

  /**
   * Provide a `toHtml` callback that `remarkToRehypeShortcodes` can use to
   * convert markdown/richtext sub-field values to HTML (e.g. the inner content
   * of container editor components). This avoids a circular import while
   * letting the shortcode preview pipeline recursively render nested markdown.
   */
  function toHtml(md: string) {
    return markdownToHtml(md, { getAsset, resolveWidget, remarkPlugins, editorComponents });
  }

  const hast = unified()
    .use(remarkToRehypeShortcodes, {
      plugins: editorComponents,
      getAsset,
      resolveWidget,
      toHtml,
    })
    .use(remarkRehype, { allowDangerousHTML: true })
    .runSync(mdast);

  return unified()
    .use(rehypeStringify, {
      allowDangerousHtml: true,
      allowDangerousCharacters: true,
      closeSelfClosing: true,
      entities: { useNamedReferences: true },
    })
    .stringify(hast);
}

/**
 * Deserialize an HTML string to Slate's Raw AST. Currently used for HTML
 * pastes.
 */
export function htmlToSlate(html: string): SlateNode {
  const hast = unified().use(rehypeParse, { fragment: true }).parse(html);

  const mdast = unified()
    .use(rehypePaperEmoji)
    .use(rehypeRemoveComments, { removeConditional: true })
    .use(rehypeRemark, { minify: false })
    .runSync<MdastRoot>(hast);

  return unified()
    .use(remarkAssertParents)
    .use(remarkPaddedLinks)
    .use(remarkWrapHtml)
    .use(remarkToSlate)
    .runSync<SlateNode>(mdast);
}

interface MarkdownToSlateOptions {
  voidCodeBlock?: boolean | undefined;
  remarkPlugins?: PluggableList | undefined;
  editorComponents?: EditorComponentsRegistry | undefined;
}

/**
 * Convert Markdown to Slate's Raw AST.
 */
export function markdownToSlate(
  markdown: string,
  {
    voidCodeBlock,
    remarkPlugins = [],
    editorComponents = emptyEditorComponents,
  }: MarkdownToSlateOptions = {},
): SlateNode[] {
  const mdast = markdownToRemark(markdown, remarkPlugins, editorComponents);

  const slateRaw = unified()
    .use(remarkWrapHtml)
    .use(remarkToSlate, { voidCodeBlock })
    .runSync<SlateNode>(mdast);

  return slateRaw.children ?? [];
}

interface SlateToMarkdownOptions {
  voidCodeBlock?: boolean | undefined;
  remarkPlugins?: PluggableList | undefined;
}

/**
 * Convert a Slate Raw AST to Markdown.
 *
 * Requires shortcode plugins to parse shortcode nodes back to text.
 *
 * Note that Unified is not utilized for the conversion from Slate's Raw AST to
 * MDAST. The conversion is manual because Unified can only operate on Unist
 * trees.
 */
export function slateToMarkdown(
  raw: SlateNode[],
  { voidCodeBlock, remarkPlugins = [] }: SlateToMarkdownOptions = {},
  editorComponents: EditorComponentsRegistry = emptyEditorComponents,
): string {
  const mdast = slateToRemark(raw, { voidCodeBlock });
  return remarkToMarkdown(mdast, remarkPlugins, editorComponents);
}

export type { Pluggable, PluggableList };
