import { useEffect, useRef } from 'react';

import { collectionChordKeys } from '@/core/lib/collectionShortcuts';
import { registerShortcut } from '@/core/lib/shortcuts';

import type { CmsCollectionState } from '@/lib/util/index';

interface CollectionChordOptions {
  /** Collections the user can see, in sidebar order. */
  collections: CmsCollectionState[];
  /** Shortcut id prefix; the collection name is appended. */
  idPrefix: string;
  group: string;
  go: (collection: CmsCollectionState) => void;
}

/**
 * Registers a 'g <key>' chord per collection (configured `shortcut` or
 * positional 'g 1'..'g 9'). Registered imperatively because the set varies
 * with config; shared by every app shell.
 */
export function useCollectionChordShortcuts({ collections, idPrefix, group, go }: CollectionChordOptions): void {
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    const chordKeys = collectionChordKeys(collections);
    const disposers = collections
      .filter(collection => chordKeys.has(collection.name))
      .map(collection =>
        registerShortcut({
          id: `${idPrefix}.${collection.name}`,
          sequence: `g ${chordKeys.get(collection.name)}`,
          label: `Go to ${collection.label}`,
          group,
          run: () => goRef.current(collection),
        })
      );
    return () => disposers.forEach(dispose => dispose());
  }, [collections, idPrefix, group]);
}
