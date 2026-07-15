import { useMemo } from 'react';
import { PortableText } from '@portabletext/react';

import {
  createRichtextValue,
  listBlocks,
  type PortableTextDocument,
  RichtextValue,
} from '@/lib/richtext';

import type { PortableTextReactComponents } from '@portabletext/react';
import type { ReactNode } from 'react';

interface LexicalPreviewProps {
  /** Stored field value — either a live `RichtextValue` proxy or a raw string. */
  value?: string | RichtextValue | PortableTextDocument;
  field?: { format?: string };
}

/** `@portabletext/react` renderers for every registered block with a preview. */
function blockPreviewComponents(): Partial<PortableTextReactComponents> {
  const types: PortableTextReactComponents['types'] = {};
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
    // Preview approximates the published page; blocks without a preview
    // component (including unknown types) simply don't render there.
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
