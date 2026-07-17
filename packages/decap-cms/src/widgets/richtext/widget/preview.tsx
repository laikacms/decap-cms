import { PortableText } from '@portabletext/react';
import { useMemo } from 'react';
import sanitizeHtml from 'sanitize-html';

import { createRichtextValue, listBlocks, type PortableTextDocument, RichtextValue } from '@/lib/richtext';

import type { PortableTextReactComponents } from '@portabletext/react';
import type { ReactNode } from 'react';

/**
 * Allowlist sanitizer for the reserved `html` PT block's raw markup before
 * it is mounted via `dangerouslySetInnerHTML` in the preview iframe.
 *
 * The preview host (`EditorPreviewPane`) mounts via `react-frame-component`,
 * whose default iframe is `about:blank` and therefore same-origin with the
 * CMS admin — so an unsanitized `html` block is a same-origin admin-panel
 * XSS vector (session cookie, redux store, `window.parent`). This strips
 * `<script>`/`<iframe>`/`<object>`/`<embed>` entirely, drops every
 * `on*` event-handler attribute, and only allows `href`/`src` values using
 * `http:`, `https:`, `mailto:`, or same-document `#`/relative references —
 * `javascript:`, `data:`, and `vbscript:` schemes are rejected.
 */
function sanitizeReservedHtmlBlock(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'id', 'title', 'lang', 'dir'],
      img: ['src', 'alt', 'title', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
}

interface LexicalPreviewProps {
  /** Stored field value — either a live `RichtextValue` proxy or a raw string. */
  value?: string | RichtextValue | PortableTextDocument;
  field?: { format?: string };
}

/** Row/cell shape emitted by the Lexical → PortableText table bridge. */
interface TableCell {
  _key?: string;
  value?: unknown;
}
interface TableRow {
  _key?: string;
  cells?: TableCell[];
}

/**
 * Renderers for the reserved PT block types the Lexical bridge itself emits
 * (`lib/richtext/blocks/registry.ts` `RESERVED_BLOCK_TYPES`). These aren't
 * custom blocks — they never go through `registerBlock` — so without an
 * explicit renderer `@portabletext/react` treats them as unknown, drops
 * them, and warns. Custom-block ids can't collide with these (reserved ids
 * are rejected at registration), but the loop below still runs after this
 * table so a future override remains possible.
 */
function reservedBlockPreviewComponents(): PortableTextReactComponents['types'] {
  return {
    image: ({ value }) => {
      const { src, alt } = value as { src?: string, alt?: string };
      if (!src) return null;
      return <img src={src} alt={alt ?? ''} />;
    },
    code: ({ value }) => {
      const { code, language } = value as { code?: string, language?: string | null };
      return (
        <pre>
          <code className={language ? `language-${language}` : undefined}>{code ?? ''}</code>
        </pre>
      );
    },
    'horizontal-rule': () => <hr />,
    table: ({ value }) => {
      const { rows, headerRows } = value as { rows?: TableRow[], headerRows?: number };
      if (!rows?.length) return null;
      return (
        <table>
          <tbody>
            {rows.map((row, rowIndex) => {
              const CellTag = headerRows && rowIndex < headerRows ? 'th' : 'td';
              return (
                <tr key={row._key ?? rowIndex}>
                  {(row.cells ?? []).map((cell, cellIndex) => (
                    <CellTag key={cell._key ?? cellIndex}>{String(cell.value ?? '')}</CellTag>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    },
    callout: ({ value }) => {
      const { text } = value as { text?: unknown };
      return <div>{typeof text === 'string' ? text : JSON.stringify(value)}</div>;
    },
    html: ({ value }) => {
      const { html } = value as { html?: unknown };
      if (typeof html !== 'string') return null;
      return <div dangerouslySetInnerHTML={{ __html: sanitizeReservedHtmlBlock(html) }} />;
    },
  };
}

/** `@portabletext/react` renderers for every registered block with a preview. */
function blockPreviewComponents(): Partial<PortableTextReactComponents> {
  const types: PortableTextReactComponents['types'] = { ...reservedBlockPreviewComponents() };
  for (const definition of listBlocks()) {
    const Preview = definition.preview;
    if (!Preview) continue;
    types[definition.id] = ({ value }) => {
      const { _type, _key, ...data } = (value ?? {}) as Record<string, unknown>;
      void _type;
      void _key;
      return <Preview data={data} definition={definition} />;
    };
  }
  return {
    types,
    // Preview approximates the published page; genuinely unknown block
    // types (not owned by the bridge or a registered custom block) simply
    // don't render there.
    unknownType: () => null,
  };
}

/**
 * Decap CMS preview component for the Lexical widget.
 *
 * Renders the canonical Portable Text representation via `@portabletext/react`.
 * Works whether Decap passes the live proxy or the original raw string.
 */
export function LexicalPreview({ value, field }: LexicalPreviewProps): ReactNode {
  const hint = field?.format;
  let portableText: PortableTextDocument = [];

  if (value instanceof RichtextValue) {
    portableText = value.portableText;
  } else if (typeof value === 'string') {
    portableText = createRichtextValue(value, { hint }).portableText;
  } else if (Array.isArray(value)) {
    portableText = value;
  }

  // The block registry is boot-static; recompute only per mount.

  const components = useMemo(() => blockPreviewComponents(), []);

  return <PortableText value={portableText} components={components} />;
}
