import type { PortableTextDocument } from './portable-text';
import type { Mapper } from './types';

/**
 * The identity mapper: Portable Text stored/round-tripped as its own JSON
 * serialization. Exists so a field's `format` can be `portableText` when the
 * stored value already *is* the canonical document (e.g. content authored
 * directly as PT, or migrated straight from a Sanity dataset) — no format
 * conversion needed, `fromPortableText`/`toPortableText` are pure
 * (de)serialization.
 */
export const portableTextMapper: Mapper = {
  id: 'portableText',
  label: 'Portable Text',

  toPortableText(value: string): PortableTextDocument {
    const parsed: unknown = JSON.parse(value);
    if (!isPortableTextDocument(parsed)) {
      throw new Error('lib-richtext: portableText mapper received a value that is not a Portable Text document array');
    }
    return parsed;
  },

  fromPortableText(doc: PortableTextDocument): string {
    return JSON.stringify(doc);
  },

  detect(value: string): number {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      return 0;
    }
    return isPortableTextDocument(parsed) ? 1 : 0;
  },
};

function isPortableTextDocument(value: unknown): value is PortableTextDocument {
  return Array.isArray(value) && value.every(isTypedObject);
}

function isTypedObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { _type?: unknown })._type === 'string';
}

export default portableTextMapper;
