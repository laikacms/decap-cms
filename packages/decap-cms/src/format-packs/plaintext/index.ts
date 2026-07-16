import { createKeyGenerator } from '@/lib/richtext';

import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';
import type { FormatPack, Mapper, PortableTextDocument } from '@/lib/richtext';

const HTML_TAG = /<\/?[a-z][^>]*>/i;
const MARKDOWN_SYNTAX = /^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^>\s|```|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]+\)/m;

/**
 * The plain-text mapper — the simplest Portable Text adapter: paragraphs
 * separated by a blank line, no marks, no styles. For fields that only ever
 * need unformatted prose (short descriptions, excerpts, …) but still want to
 * share the editor + Portable Text pipeline instead of a bespoke string
 * widget.
 */
export const plainTextMapper: Mapper = {
  id: 'plainText',
  label: 'Plain text',

  toPortableText(value: string): PortableTextDocument {
    const nextKey = createKeyGenerator('k');
    const paragraphs = value.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    return paragraphs.map((text): PortableTextBlock => ({
      _type: 'block',
      _key: nextKey(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: nextKey(),
          text,
          marks: [],
        },
      ],
    }));
  },

  fromPortableText(doc: PortableTextDocument): string {
    return doc
      .map(block => blockText(block))
      .filter(text => text.length > 0)
      .join('\n\n');
  },

  detect(value: string): number {
    if (value.trim() === '') return 0;
    if (HTML_TAG.test(value)) return 0;
    if (MARKDOWN_SYNTAX.test(value)) return 0.1;
    return 0.25;
  },
};

function blockText(block: PortableTextDocument[number]): string {
  if (block._type !== 'block' || !Array.isArray((block as PortableTextBlock).children)) {
    return '';
  }
  return (block as PortableTextBlock).children
    .map(child => ((child as PortableTextSpan)._type === 'span' ? (child as PortableTextSpan).text : ''))
    .join('');
}

/** The plain-text format pack. Register via `CMS.registerRichtextFormat(plainTextFormat)`. */
export const plainTextFormat: FormatPack = {
  id: 'plainText',
  label: 'Plain text',
  mapper: plainTextMapper,
};

export default plainTextMapper;
