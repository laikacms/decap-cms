import { getActiveRouting } from './registry';

/**
 * Imperative navigation helpers for use outside React (Redux thunks and the
 * editor hooks). They drive the active router + routing table registered by
 * `DecapCmsProvider` — the same pair the context hooks and `<Link>` use — so
 * every navigation path stays in sync, including when a consumer supplies a
 * custom router or table.
 */

export function navigateToCollection(collectionName: string) {
  const { router, routing } = getActiveRouting();
  router.push(routing.collection.create({ collectionName }));
}

export function navigateToNewEntry(collectionName: string) {
  const { router, routing } = getActiveRouting();
  router.replace(routing.entryNew.create({ collectionName }));
}

export function navigateToEntry(collectionName: string, slug: string) {
  const { router, routing } = getActiveRouting();
  router.replace(routing.entry.create({ collectionName, slug }));
}
