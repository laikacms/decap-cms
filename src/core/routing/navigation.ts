import { defaultRouter } from './router';

/**
 * Imperative navigation helpers for use outside React (Redux thunks and the
 * editor hooks). They drive the shared `defaultRouter` — the same router the
 * context hooks and `<Link>` use — so every navigation path stays in sync.
 */

export function navigateToCollection(collectionName: string) {
  defaultRouter.navigate('collection', { collectionName });
}

export function navigateToNewEntry(collectionName: string) {
  defaultRouter.replace('entryNew', { collectionName });
}

export function navigateToEntry(collectionName: string, slug: string) {
  defaultRouter.replace('entry', { collectionName, slug });
}
