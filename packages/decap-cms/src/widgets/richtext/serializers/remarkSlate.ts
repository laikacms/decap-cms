import { flatMap, flatten, isEmpty, isEqual } from 'lodash-es';

import type { MdastNode, SlateMark, SlateMarkName, SlateNode, SlateNodeData } from '@/widgets/richtext/types';

/**
 * Map of MDAST node types to Slate node types.
 */
const typeMap: Record<string, string> = {
  root: 'root',
  paragraph: 'p',
  blockquote: 'blockquote',
  code: 'code-block',
  listItem: 'li',
  table: 'table',
  tableRow: 'table-row',
  tableCell: 'table-cell',
  thematicBreak: 'thematic-break',
  link: 'a',
  image: 'image',
  shortcode: 'shortcode',
};

/**
 * Map of MDAST node types to Slate mark types.
 */
const markMap: Record<string, SlateMarkName> = {
  strong: 'bold',
  emphasis: 'italic',
  delete: 'strikethrough',
  inlineCode: 'code',
};

const markNodeTypes = ['strong', 'emphasis', 'delete'];

function isText(node: SlateNode) {
  return !!node.text;
}

function isMarksEqual(node1: SlateNode, node2: SlateNode) {
  return isEqual(node1.marks, node2.marks);
}

export function mergeAdjacentTexts(children: SlateNode[]): SlateNode[] {
  if (children.length <= 0) {
    return children;
  }

  const mergedChildren: SlateNode[] = [];

  let isMerging = false;
  let current: SlateNode = children[0];

  for (let i = 0; i < children.length - 1; i++) {
    if (!isMerging) {
      current = children[i];
    }
    const next = children[i + 1];
    if (isText(current) && isText(next) && isMarksEqual(current, next)) {
      isMerging = true;
      current = { ...current, text: `${current.text}${next.text}` };
    } else {
      mergedChildren.push(current);
      isMerging = false;
    }
  }

  if (isMerging) {
    mergedChildren.push(current);
  } else {
    mergedChildren.push(children[children.length - 1]);
  }

  return mergedChildren;
}

interface RemarkToSlateOptions {
  voidCodeBlock?: boolean | undefined;
}

/** Input accepted by `createText`: either a raw string or a partial text node. */
interface TextInput {
  text?: string | undefined;
  marks?: SlateMark[] | undefined;
}

/**
 * A Remark plugin for converting an MDAST to Slate Raw AST. Remark plugins
 * return a `transformNode` function that receives the MDAST as it's first argument.
 */
export default function remarkToSlate({ voidCodeBlock }: RemarkToSlateOptions = {}) {
  /**
   * Add nodes to a parent node only if `nodes` is truthy.
   */
  function addNodes(parent: SlateNode, nodes: SlateNode[] | undefined): SlateNode {
    return nodes ? { ...parent, children: nodes } : parent;
  }

  /**
   * Create a Slate Raw text node.
   */
  function createText(node: string | TextInput): SlateNode {
    if (typeof node === 'string') {
      return { text: node };
    }
    const { text, marks } = node;
    return normalizeMarks({ text, marks });
  }

  /**
   * Create a Slate Block node.
   */
  function createBlock(
    type: string,
    nodes?: SlateNode[],
    props: { data?: SlateNodeData | undefined } = {},
  ): SlateNode {
    // Ensure block nodes have at least one text child to conform to slate schema
    const children = isEmpty(nodes) ? [createText('')] : nodes;
    const node: SlateNode = { type, ...props };
    return addNodes(node, children);
  }

  /**
   * Create a Slate Inline node.
   */
  function createInline(
    type: string,
    props: { data?: SlateNodeData | undefined } = {},
    nodes?: SlateNode[],
  ): SlateNode {
    const node: SlateNode = { type, ...props };

    // Ensure inline nodes have at least one text child to conform to slate schema
    const children = isEmpty(nodes) ? [createText('')] : nodes;
    return addNodes(node, children);
  }

  function normalizeMarks(node: SlateNode): SlateNode {
    if (node.marks) {
      node.marks.forEach(mark => {
        node[mark.type] = true;
      });
    }

    return node;
  }

  function normalizeMarksDeep(node: SlateNode | SlateNode[]): SlateNode | SlateNode[] {
    return Array.isArray(node) ? node : normalizeMarks(node);
  }

  function processMarkChild(childNode: MdastNode, marks: SlateMark[]): SlateNode | SlateNode[] {
    switch (childNode.type) {
      /**
       * If a text node is a direct child of the current node, it should be
       * set aside as a text, and all marks that have been collected in the
       * `marks` array should apply to that specific text.
       */
      case 'html':
      case 'text': {
        const converted = convertNode(childNode);
        return { ...toSingleNode(converted), marks };
      }

      /**
       * MDAST inline code nodes don't have children, just a text value, similar
       * to a text node, so it receives the same treatment as a text node, but we
       * first add the inline code mark to the marks array.
       */
      case 'inlineCode': {
        const converted = convertNode(childNode);
        return { ...toSingleNode(converted), marks: [...marks, { type: 'code' }] };
      }

      /**
       * Process nested style nodes. The recursive results should be pushed into
       * the texts array. This way, every MDAST nested text structure becomes a
       * flat array of texts that can serve as the value of a single Slate Raw
       * text node.
       */
      case 'strong':
      case 'emphasis':
      case 'delete':
        return processMarkNode(childNode, marks);

      case 'link': {
        const nodes = (childNode.children ?? []).map(child => normalizeMarksDeep(processMarkChild(child, marks)));
        const result = convertNode(childNode, flatten(nodes));
        return result ?? [];
      }

      /**
       * Remaining nodes simply need mark data added to them, and to then be
       * added into the cumulative children array.
       */
      default: {
        const result = transformNode({ ...childNode, data: { ...childNode.data, marks } });
        return result ?? [];
      }
    }
  }

  function processMarkNode(node: MdastNode, parentMarks: SlateMark[] = []): SlateNode[] {
    /**
     * Add the current node's mark type to the marks collected from parent
     * mark nodes, if any.
     */
    const markType = markMap[node.type];
    const marks = markType
      ? [...parentMarks.filter(({ type }) => type !== markType), { type: markType }]
      : parentMarks;

    return flatMap(node.children ?? [], child => normalizeMarksDeep(processMarkChild(child, marks)));
  }

  /**
   * `convertNode` returns a single node for every case except mark nodes, which
   * flatten into a list of texts. This narrows the single-node cases.
   */
  function toSingleNode(node: SlateNode | SlateNode[] | undefined): SlateNode {
    if (node === undefined) return createText('');
    return Array.isArray(node) ? (node[0] ?? createText('')) : node;
  }

  /**
   * Convert a single MDAST node to a Slate Raw node. Uses local node factories
   * that mimic the unist-builder function utilized in the slateRemark
   * transformer.
   */
  function convertNode(
    node: MdastNode,
    nodes?: SlateNode[],
  ): SlateNode | SlateNode[] | undefined {
    switch (node.type) {
      /**
       * General
       *
       * Convert simple cases that only require a type and children, with no
       * additional properties.
       */
      case 'root':
      case 'paragraph':
      case 'blockquote':
      case 'tableRow':
      case 'tableCell': {
        return createBlock(typeMap[node.type], nodes);
      }

      /**
       * List Items
       *
       * Markdown list items can be empty, but a list item in the Slate schema
       * should at least have an empty paragraph node.
       */
      case 'listItem': {
        const children = isEmpty(nodes) ? [createBlock('paragraph')] : nodes;
        return createBlock(typeMap[node.type], children);
      }

      /**
       * Shortcodes
       *
       * Shortcode nodes are represented as "void" blocks in the Slate AST. They
       * maintain the same data as MDAST shortcode nodes. Slate void blocks must
       * contain a blank text node.
       */
      case 'shortcode': {
        const children = [createText('')];
        const data: SlateNodeData = { ...node.data, id: node.data?.shortcode, shortcodeNew: true };
        return createBlock(typeMap[node.type], children, { data });
      }

      case 'text': {
        return createText(node.value ?? '');
      }

      /**
       * HTML
       *
       * HTML nodes contain plain text like text nodes, except they only contain
       * HTML. Our serialization results in non-HTML being placed in HTML nodes
       * sometimes to ensure that we're never escaping HTML from the rich text
       * editor. We do not replace line feeds in HTML because the HTML is raw
       * in the rich text editor, so the writer knows they're writing HTML, and
       * should expect soft breaks to be visually absent in the rendered HTML.
       */
      case 'html': {
        return createText(node.value ?? '');
      }

      /**
       * Inline Code
       *
       * Inline code nodes from an MDAST are represented in our Slate schema as
       * text nodes with a "code" mark. We manually create the text containing
       * the inline code value and a "code" mark, and place it in an array for use
       * as a Slate text node's children array.
       */
      case 'inlineCode': {
        return createText({ text: node.value, marks: [{ type: 'code' }] });
      }

      /**
       * Marks
       *
       * Marks are typically decorative sub-types that apply to text nodes. In an
       * MDAST, marks are nodes that can contain other nodes. This nested
       * hierarchy has to be flattened and split into distinct text nodes with
       * their own set of marks.
       */
      case 'strong':
      case 'emphasis':
      case 'delete': {
        return processMarkNode(node);
      }

      /**
       * Headings
       *
       * MDAST headings use a single type with a separate "depth" property to
       * indicate the heading level, while the Slate schema uses a separate node
       * type for each heading level. Here we get the proper Slate node name based
       * on the MDAST node depth.
       */
      case 'heading': {
        return createBlock(`h${node.depth}`, nodes);
      }

      /**
       * Code Blocks
       *
       * MDAST code blocks are a distinct node type with a simple text value. We
       * convert that value into a nested child text node for Slate. If a void
       * node is required due to a custom code block handler, the value is
       * stored in the "code" data property instead. We also carry over the "lang"
       * data property if it's defined.
       */
      case 'code': {
        const data: SlateNodeData = {
          lang: node.lang,
          ...(voidCodeBlock ? { code: node.value } : {}),
          shortcode: 'code-block',
          shortcodeData: {
            code: node.value,
            lang: node.lang,
          },
        };
        const text = createText(voidCodeBlock ? '' : node.value ?? '');
        return createBlock('shortcode', [text], { data });
      }

      /**
       * Lists
       *
       * MDAST has a single list type and an "ordered" property. We derive that
       * information into the Slate schema's distinct list node types. We also
       * include the "start" property, which indicates the number an ordered list
       * starts at, if defined.
       */
      case 'list': {
        const slateType = node.ordered ? 'ol' : 'ul';
        const data: SlateNodeData = { start: node.start };
        return createBlock(slateType, nodes, { data });
      }

      /**
       * Breaks
       *
       * MDAST soft break nodes represent a trailing double space or trailing
       * slash from a Markdown document. In Slate, these are simply transformed to
       * line breaks within a text node.
       */
      case 'break': {
        return createInline('break', { data: node.data });
      }

      /**
       * Thematic Breaks
       *
       * Thematic breaks are void nodes in the Slate schema.
       */
      case 'thematicBreak': {
        return createBlock(typeMap[node.type]);
      }

      /**
       * Links
       *
       * MDAST stores the link attributes directly on the node, while our Slate
       * schema references them in the data object.
       */
      case 'link': {
        const { title, url, data } = node;
        return createInline(typeMap[node.type], { data: { ...data, title, url } }, nodes);
      }

      /**
       * Images
       *
       * Identical to link nodes except for the lack of child nodes and addition
       * of alt attribute data MDAST stores the link attributes directly on the
       * node, while our Slate schema references them in the data object.
       */
      case 'image': {
        const { title, url, alt, data } = node;
        return createInline(typeMap[node.type], { data: { ...data, title, alt, url } });
      }

      /**
       * Tables
       *
       * Tables are parsed separately because they may include an "align"
       * property, which should be passed to the Slate node.
       */
      case 'table': {
        return createBlock(typeMap[node.type], nodes, { data: { align: node.align } });
      }

      default:
        return undefined;
    }
  }

  function transformNode(node: MdastNode): SlateNode | SlateNode[] | undefined {
    /**
     * Call `transformNode` recursively on child nodes.
     *
     * If a node returns a falsey value, filter it out. Some nodes do not
     * translate from MDAST to Slate, such as definitions for link/image
     * references or footnotes.
     */
    let children: SlateNode[] | undefined = undefined;

    if (!markNodeTypes.includes(node.type) && !isEmpty(node.children)) {
      children = flatMap(node.children ?? [], transformNode).filter(
        (val): val is SlateNode => !!val,
      );
      // Merge adjacent text nodes with the same marks to conform to slate schema
      children = mergeAdjacentTexts(children);
    }

    /**
     * Run individual nodes through the conversion factory.
     */
    return convertNode(node, children);
  }

  return transformNode;
}
