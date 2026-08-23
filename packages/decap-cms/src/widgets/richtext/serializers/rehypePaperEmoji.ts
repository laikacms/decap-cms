/**
 * Dropbox Paper outputs emoji characters as images, and stores the actual
 * emoji character in a `data-emoji-ch` attribute on the image. This plugin
 * replaces the images with the emoji characters.
 */

/** The subset of a HAST element node this plugin reads. */
interface HastNode {
  type: string;
  tagName?: string | undefined;
  value?: string | undefined;
  properties?: { dataEmojiCh?: string } | undefined;
  children?: HastNode[] | undefined;
}

export default function rehypePaperEmoji() {
  function transform(node: HastNode): HastNode {
    if (node.tagName === 'img' && node.properties?.dataEmojiCh) {
      return { type: 'text', value: node.properties.dataEmojiCh };
    }
    node.children = node.children ? node.children.map(transform) : node.children;
    return node;
  }

  return transform;
}
