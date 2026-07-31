import { history } from '../routing/history';
import { getCollectionUrl, getNewEntryUrl } from '../lib/urlHelper';

export function searchCollections(query: string, collection: string) {
  const encodedQuery = encodeURIComponent(query);
  if (collection) {
    history.push(`/collections/${collection}/search/${encodedQuery}`);
  } else {
    history.push(`/search/${encodedQuery}`);
  }
}

export function showCollection(collectionName: string) {
  history.push(getCollectionUrl(collectionName));
}

export function createNewEntry(collectionName: string) {
  history.push(getNewEntryUrl(collectionName));
}
