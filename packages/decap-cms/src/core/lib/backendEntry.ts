import { attempt, isError } from 'lodash-es';

import { resolveFormat } from '@/core/formats/formats';
import { assertNeverContent } from '@/lib/backend/index';

import type { BackendEntryContent } from '@/lib/backend/index';
import type { CmsCollectionState } from '@/lib/util/index';

/**
 * The engine's side of the backend seam (DCMS-1907): everything that turns
 * "what a backend handed us" into "the fields of an entry" lives here, so
 * there is exactly one place that knows how content is carried.
 */

/**
 * An entry's fields, however the backend chose to carry its content: raw text
 * is parsed with the collection's format, structured data is taken as it is
 * (by reference - a backend that already holds documents must not pay for a
 * serialize/parse round trip).
 *
 * An unparseable file yields no fields rather than failing the whole listing,
 * which is the long-standing behavior: the entry still appears, it just has
 * nothing in it.
 */
export function entryDataFromContent(
  collection: CmsCollectionState,
  path: string,
  content: BackendEntryContent,
): Record<string, unknown> {
  switch (content.kind) {
    case 'raw': {
      const format = resolveFormat(collection, { path });
      const data = (format && attempt(format.fromFile.bind(format, content.raw))) || {};
      if (isError(data)) {
        console.error(data);
        return {};
      }
      return data as Record<string, unknown>;
    }
    case 'parsed':
      return content.data;
    default:
      return assertNeverContent(content);
  }
}

/**
 * The `raw` field the store's entry shape still carries. Empty for structured
 * content, which has no source text - nothing reads it today except the local
 * draft backup, which regenerates it from the draft. Removed together with
 * `EntryValue.raw` in stage 5.
 */
export function legacyRaw(content: BackendEntryContent): string {
  return content.kind === 'raw' ? content.raw : '';
}

/**
 * Whether content that was fetched successfully means "an entry lives here",
 * for the duplicate-slug check. Content shape must not change the answer:
 *
 * - raw: non-empty text. Backends that report a missing file by resolving with
 *   empty text rather than rejecting (github does) depend on this, and
 *   `generateUniqueSlug` loops forever if a missing entry reads as existing.
 * - parsed: always. A record the backend returned exists, even when it has no
 *   fields yet; there is no empty-string sentinel to confuse it with.
 */
export function contentExists(content: BackendEntryContent): boolean {
  switch (content.kind) {
    case 'raw':
      return Boolean(content.raw);
    case 'parsed':
      return true;
    default:
      return assertNeverContent(content);
  }
}
