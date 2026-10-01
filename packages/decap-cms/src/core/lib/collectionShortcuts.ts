import type { CmsCollectionState } from '@/lib/util/index';

/**
 * The 'g <key>' chord key for each visible collection, by collection name.
 * A collection with a valid configured `shortcut` (single letter/digit in
 * config.yml) uses that key; the rest fall back to their 1-based sidebar
 * position, first nine only. Configured keys win over app-shell defaults
 * on conflict (they register later, and the engine prefers the last
 * registration), so `shortcut: m` deliberately beats 'g m' media library.
 */
export function collectionChordKeys(collections: CmsCollectionState[]): Map<string, string> {
  const keys = new Map<string, string>();
  collections.forEach((collection, index) => {
    const configured = typeof collection.shortcut === 'string' && /^[a-zA-Z0-9]$/.test(collection.shortcut)
      ? collection.shortcut.toLowerCase()
      : null;
    if (configured) {
      keys.set(collection.name, configured);
    } else if (index < 9) {
      keys.set(collection.name, String(index + 1));
    }
  });
  return keys;
}
