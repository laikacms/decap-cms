import { defaultRouter, defaultRoutingTable } from '../routing/router';
import { getCollectionUrl, getNewEntryUrl } from '../lib/urlHelper';

/**
 * Routes through `defaultRoutingTable`'s creators rather than hand-templating
 * the URL, so the query (which may contain spaces, `/`, `#`, unicode, etc.)
 * goes through the single `encodeURIComponent` choke point (DCMS-444).
 */
export function searchCollections(query: string, collection: string) {
  if (collection) {
    defaultRouter.push(
      defaultRoutingTable.collectionSearch.create({
        collectionName: collection,
        searchTerm: query,
      }),
    );
  } else {
    defaultRouter.push(defaultRoutingTable.search.create({ searchTerm: query }));
  }
}

export function showCollection(collectionName: string) {
  defaultRouter.push(getCollectionUrl(collectionName));
}

export function createNewEntry(collectionName: string) {
  defaultRouter.push(getNewEntryUrl(collectionName));
}
