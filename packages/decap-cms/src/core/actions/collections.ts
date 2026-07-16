import { getActiveRouting } from '@/core/routing/registry';

/**
 * Routes through the active routing table's creators rather than
 * hand-templating the URL, so the query (which may contain spaces, `/`, `#`,
 * unicode, etc.) goes through the single `encodeURIComponent` choke point
 * (DCMS-444) — and a consumer-supplied router/table is honoured.
 */
export function searchCollections(query: string, collection: string) {
  const { router, routing } = getActiveRouting();
  if (collection) {
    router.push(
      routing.collectionSearch.create({
        collectionName: collection,
        searchTerm: query,
      }),
    );
  } else {
    router.push(routing.search.create({ searchTerm: query }));
  }
}

export function showCollection(collectionName: string) {
  const { router, routing } = getActiveRouting();
  router.push(routing.collection.create({ collectionName }));
}

export function createNewEntry(collectionName: string) {
  const { router, routing } = getActiveRouting();
  router.push(routing.entryNew.create({ collectionName }));
}
