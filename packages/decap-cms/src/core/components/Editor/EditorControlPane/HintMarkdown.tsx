import React from 'react';

import { getFormat, getMapper } from '@/lib/richtext';

/**
 * Renders a field hint as markdown WHEN the `markdown` format pack is
 * registered: the hint is parsed with the pack's own mapper (text ->
 * Portable Text) and the resulting document is drawn inline-only below —
 * links, bold, italic and strikethrough; everything else unwraps to its
 * text content. Without the pack — bare bundles that never register
 * markdown — the hint renders as plain text, and this module carries no
 * markdown parser of its own.
 */

interface PtMarkDef {
  _key: string;
  _type: string;
  href?: string;
  title?: string;
}

interface PtSpan {
  _type: string;
  text?: string;
  marks?: string[];
}

interface PtBlock {
  _type: string;
  children?: PtSpan[];
  markDefs?: PtMarkDef[];
  text?: string;
  code?: string;
}

const DECORATOR_ELEMENTS: Record<string, 'strong' | 'em' | 'del'> = {
  strong: 'strong',
  em: 'em',
  'strike-through': 'del',
};

function renderSpan(span: PtSpan, markDefs: PtMarkDef[], key: number): React.ReactNode {
  if (typeof span.text !== 'string') return null;
  let node: React.ReactNode = span.text;
  const marks = span.marks ?? [];
  // Decorators wrap innermost, annotations (links) outermost:
  // [**bold link**](url) must yield <a><strong>…</strong></a>.
  for (const mark of marks) {
    const Element = DECORATOR_ELEMENTS[mark];
    if (Element) {
      node = <Element>{node}</Element>;
    }
    // Any other decorator (inline code, underline) is unwrapped to text.
  }
  for (const mark of marks) {
    const def = markDefs.find(candidate => candidate._key === mark);
    if (def?._type === 'link' && typeof def.href === 'string') {
      node = (
        <a
          href={def.href}
          title={def.title ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          {node}
        </a>
      );
    }
    // Unknown annotations are unwrapped to their text content.
  }
  return <React.Fragment key={key}>{node}</React.Fragment>;
}

function renderBlock(block: PtBlock): React.ReactNode {
  if (block._type === 'block' && Array.isArray(block.children)) {
    // Block style (heading, blockquote, list item) is intentionally ignored:
    // hints allow inline formatting only.
    const markDefs = block.markDefs ?? [];
    return block.children.map((span, index) => renderSpan(span, markDefs, index));
  }
  // Non-text blocks: keep their text content when they have any (e.g. code
  // blocks), drop the rest (images, embeds).
  if (typeof block.code === 'string') return block.code;
  if (typeof block.text === 'string') return block.text;
  return null;
}

export default function HintMarkdown({ source }: { source: string }) {
  const markdownRegistered = getFormat('markdown') !== undefined;
  const blocks = React.useMemo(
    () => (markdownRegistered ? (getMapper('markdown').toPortableText(source) as PtBlock[]) : null),
    [source, markdownRegistered],
  );
  if (blocks === null) {
    return <>{source}</>;
  }
  return (
    <>
      {blocks.map((block, index) => (
        <React.Fragment key={index}>
          {index > 0 && '\n'}
          {renderBlock(block)}
        </React.Fragment>
      ))}
    </>
  );
}
