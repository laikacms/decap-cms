import { htmlToPortableText } from '@portabletext/html';
import { toHTML } from '@portabletext/to-html';

import { createKeyGenerator } from '@/lib/richtext';

import type { PortableTextBlock } from '@portabletext/types';
import type { FormatPack, Mapper, PortableTextDocument } from '@/lib/richtext';

/** HTML tag/entity probes; each hit raises the detection score. */
const HTML_PROBES: readonly RegExp[] = [
  /<\/?(p|div|span|h[1-6]|ul|ol|li|blockquote|strong|em|b|i|u|a|br|pre|code)\b[^>]*>/i,
  /&(amp|lt|gt|quot|#39);/,
];

/**
 * The HTML mapper — a thin Portable Text adapter for consumers that store
 * (or need to emit) HTML rather than markdown. Wraps `@portabletext/html`
 * (parse) and `@portabletext/to-html` (serialize) so HTML never has its own
 * bespoke editor mapping — it only ever flows through Portable Text.
 */
export const htmlMapper: Mapper = {
  id: 'html',
  label: 'HTML',

  toPortableText(value: string): PortableTextDocument {
    return htmlToPortableText(value, {
      keyGenerator: createKeyGenerator('k'),
    }) as unknown as PortableTextDocument;
  },

  fromPortableText(doc: PortableTextDocument): string {
    return toHTML(doc as unknown as PortableTextBlock[]);
  },

  detect(value: string): number {
    if (value.trim() === '') return 0;
    let hits = 0;
    for (const probe of HTML_PROBES) {
      if (probe.test(value)) hits += 1;
    }
    if (hits === 0) return 0;
    return Math.min(1, 0.5 + hits * 0.25);
  },
};

/** The HTML format pack. Register via `CMS.registerRichtextFormat(htmlFormat)`. */
export const htmlFormat: FormatPack = {
  id: 'html',
  label: 'HTML',
  mapper: htmlMapper,
};

export default htmlMapper;
