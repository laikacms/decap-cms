import definitions from 'mdast-util-definitions';
import u from 'unist-builder';

import type { MdastNode } from '@/widgets/richtext/types';

type GetDefinition = (identifier: string) => { url?: string, title?: string | null } | null;

/** A node may expand into several nodes, or disappear entirely. */
type TransformResult = MdastNode | MdastNode[] | null;

/**
 * Raw markdown may contain image references or link references. Because there
 * is no way to maintain these references within the Slate AST, we convert image
 * and link references to standard images and links by putting their url's
 * inline. The definitions are then removed from the document.
 *
 * For example, the following markdown:
 *
 * ```
 * ![alpha][bravo]
 *
 * [bravo]: http://example.com/example.jpg
 * ```
 *
 * Yields:
 *
 * ```
 * ![alpha](http://example.com/example.jpg)
 * ```
 */
export default function remarkSquashReferences() {
  function transform(getDefinition: GetDefinition, node: MdastNode): TransformResult {
    /**
     * Bind the `getDefinition` function to `transform` and recursively map all
     * nodes.
     */
    function boundTransform(child: MdastNode) {
      return transform(getDefinition, child);
    }

    const children = node.children ? node.children.map(boundTransform) : node.children;

    /**
     * Combine reference and definition nodes into standard image and link
     * nodes.
     */
    if (['imageReference', 'linkReference'].includes(node.type)) {
      const type = node.type === 'imageReference' ? 'image' : 'link';
      const definition = node.identifier ? getDefinition(node.identifier) : null;

      const flatChildren = children === undefined ? undefined : flattenChildren(children);

      if (definition) {
        const { title, url } = definition;
        const props = { title, url, alt: node.alt };
        return flatChildren
          ? u<MdastNode>(type, props, flatChildren)
          : u<MdastNode>(type, props);
      }

      const pre = u<MdastNode>('text', node.type === 'imageReference' ? '![' : '[');
      const post = u<MdastNode>('text', ']');
      const nodes = flatChildren ?? [u<MdastNode>('text', node.alt ?? '')];
      return [pre, ...nodes, post];
    }

    /**
     * Remove definition nodes and filter the resulting null values from the
     * filtered children array.
     */
    if (node.type === 'definition') {
      return null;
    }

    return { ...node, children: children === undefined ? [] : flattenChildren(children) };
  }

  /** Drop the nulls left by removed definitions and flatten split references. */
  function flattenChildren(children: TransformResult[]): MdastNode[] {
    const flattened: MdastNode[] = [];
    for (const child of children) {
      if (child === null) continue;
      if (Array.isArray(child)) flattened.push(...child);
      else flattened.push(child);
    }
    return flattened;
  }

  return function getTransform(node: MdastNode) {
    const getDefinition = definitions(node);
    return transform(getDefinition, node);
  };
}
