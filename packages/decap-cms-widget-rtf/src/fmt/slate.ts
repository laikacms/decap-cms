import type { FormatConverter, SlateNode } from './common';

export class IdentityFormatConverter implements FormatConverter<SlateNode[]> {
  readonly formatName = 'identity';
  fromSlate(slateNodes: SlateNode[]): SlateNode[] {
    return stripMetadataFromNodes(slateNodes);
  }
  toSlate(content: SlateNode[]): SlateNode[] {
    if (!Array.isArray(content)) return [];
    return content;
  }
  detect?(content: any): boolean {
    return (
      Array.isArray(content) &&
      content.every(node => typeof node === 'object' && 'children' in node)
    );
  }
}

export const slateConverter = new IdentityFormatConverter();

// --- Internal helper (simplified) ------------------------------------------

function stripMetadataFromNodes(nodes: SlateNode[]): SlateNode[] {
  return nodes.map(stripNodeMetadata);
}

function stripNodeMetadata(node: SlateNode): SlateNode {
  return {
    ...node,
    ...(node.children ? { children: node.children.map(stripNodeMetadata) } : {}),
  }  as SlateNode;
}
