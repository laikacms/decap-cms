import { htmlToPortableText } from '@portabletext/html';
import { escapeHTML, toHTML } from '@portabletext/to-html';

import { createKeyGenerator } from '@/lib/richtext';

import type { FormatPack, Mapper, PortableTextDocument } from '@/lib/richtext';
import type { DeserializerRule } from '@portabletext/html';
import type { PortableTextHtmlComponents } from '@portabletext/to-html';
import type { PortableTextBlock } from '@portabletext/types';

/** HTML tag/entity probes; each hit raises the detection score. */
const HTML_PROBES: readonly RegExp[] = [
  /<\/?(p|div|span|h[1-6]|ul|ol|li|blockquote|strong|em|b|i|u|a|br|pre|code|table|thead|tbody|tr|th|td)\b[^>]*>/i,
  /&(amp|lt|gt|quot|#39);/,
];

/**
 * Parse a `<table>` element into the structured PT table shape the bridge
 * round-trips (`{_type:'table', headerRows?, rows: [{cells: [{value}]}]}`,
 * DCMS-253). Without this rule `@portabletext/html` flattens every table
 * into bare paragraphs, which loses the table at persist.
 *
 * Cell contents are re-parsed as their own PT documents (via `innerHTML`)
 * so marks, links and nested markup inside cells survive; the shared
 * `keyGenerator` keeps keys deterministic across the whole document.
 */
function createTableRule(keyGenerator: () => string): DeserializerRule {
  return {
    deserialize(el) {
      if (el.nodeType !== 1 || (el as Element).tagName.toLowerCase() !== 'table') {
        return undefined;
      }
      const table = el as HTMLTableElement;
      // Claim the table's `_key` first so key order stays document order.
      const tableKey = keyGenerator();

      let headerRows = 0;
      // `table.rows` yields this table's own rows in visual order; rows of
      // nested tables belong to the inner table and recurse via `cellValue`.
      const rows = Array.from(table.rows).map((rowEl, rowIndex) => {
        const cellEls = Array.from(rowEl.cells);
        // Leading rows made entirely of `<th>` cells form the header.
        if (
          rowIndex === headerRows
          && cellEls.length > 0
          && cellEls.every(cell => cell.tagName.toLowerCase() === 'th')
        ) {
          headerRows += 1;
        }
        return {
          _type: 'row',
          _key: keyGenerator(),
          cells: cellEls.map(cellEl => ({
            _type: 'cell',
            _key: keyGenerator(),
            value: cellValue(cellEl, keyGenerator),
          })),
        };
      });

      return {
        _type: 'table',
        _key: tableKey,
        ...(headerRows > 0 ? { headerRows } : {}),
        rows,
      };
    },
  };
}

/** One `<td>`/`<th>`'s children as their own Portable Text document. */
function cellValue(cellEl: HTMLTableCellElement, keyGenerator: () => string): PortableTextDocument {
  const html = cellEl.innerHTML.trim();
  if (html === '') return [];
  return parseHtml(html, keyGenerator);
}

/** Shared parse entry so tables nest and keys stay on one generator. */
function parseHtml(html: string, keyGenerator: () => string): PortableTextDocument {
  return htmlToPortableText(html, {
    keyGenerator,
    rules: [createTableRule(keyGenerator)],
    types: {
      image: ({ context, value }) => ({
        _type: 'image',
        _key: context.keyGenerator(),
        src: typeof value.src === 'string' ? value.src : '',
        alt: typeof value.alt === 'string' ? value.alt : '',
      }),
      code: ({ context, value }) => ({
        _type: 'code',
        _key: context.keyGenerator(),
        code: value.code,
        language: value.language ?? null,
      }),
    },
  }) as unknown as PortableTextDocument;
}

/**
 * Render one cell's PT document back to HTML. A cell holding a single plain
 * paragraph collapses to inline content (`<td>text</td>`), matching how
 * hand-written table markup looks; anything richer keeps its block markup.
 */
function renderCellContent(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  const html = toHTML(value as PortableTextBlock[], { components });
  const single = /^<p>([\s\S]*)<\/p>$/.exec(html);
  if (single && !single[1].includes('<p>')) return single[1];
  return html;
}

/** Serialize a structured PT table block back to `<table>` markup. */
function renderTable(value: Record<string, unknown>): string {
  const headerRows = typeof value.headerRows === 'number' ? value.headerRows : 0;
  const rows = Array.isArray(value.rows) ? (value.rows as Array<Record<string, unknown>>) : [];

  const renderRow = (row: Record<string, unknown>, tag: 'th' | 'td'): string => {
    const cells = Array.isArray(row?.cells) ? (row.cells as Array<Record<string, unknown>>) : [];
    const rendered = cells
      .map(cell => `<${tag}>${renderCellContent(cell?.value)}</${tag}>`)
      .join('');
    return `<tr>${rendered}</tr>`;
  };

  const head = rows.slice(0, headerRows).map(row => renderRow(row, 'th')).join('');
  const body = rows.slice(headerRows).map(row => renderRow(row, 'td')).join('');
  return `<table>${head ? `<thead>${head}</thead>` : ''}${body ? `<tbody>${body}</tbody>` : ''}</table>`;
}

/**
 * Serializer components for every block type the editor bridge emits
 * (`block` and marks are built in; these cover the rest). Without them,
 * `toHTML` treats e.g. tables as unknown types and the content degrades.
 */
const components: Partial<PortableTextHtmlComponents> = {
  types: {
    table: ({ value }) => renderTable(value as unknown as Record<string, unknown>),
    image: ({ value }) => {
      const { src, alt } = value as unknown as { src?: string, alt?: string };
      if (typeof src !== 'string' || src === '') return '';
      return `<img src="${escapeHTML(src)}"${alt ? ` alt="${escapeHTML(alt)}"` : ''}/>`;
    },
    code: ({ value }) => {
      const { code, language } = value as unknown as { code?: string, language?: string | null };
      const cls = typeof language === 'string' && language !== ''
        ? ` class="language-${escapeHTML(language)}"`
        : '';
      return `<pre><code${cls}>${escapeHTML(typeof code === 'string' ? code : '')}</code></pre>`;
    },
    'horizontal-rule': () => '<hr/>',
  },
  unknownType: ({ value }) => {
    const type = (value as { _type?: string })._type ?? '(unknown)';
    console.warn(
      `[richtext] no HTML serialization for block "${type}"; dropping it. `
        + 'Register the block with a `formats.html` codec to control its HTML encoding.',
    );
    return '';
  },
};

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
    // Deterministic keys keep `html -> PT` stable across calls.
    return parseHtml(value, createKeyGenerator('k'));
  },

  fromPortableText(doc: PortableTextDocument): string {
    return toHTML(doc as unknown as PortableTextBlock[], { components });
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
