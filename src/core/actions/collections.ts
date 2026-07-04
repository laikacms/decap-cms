import { defaultRouter } from '../routing/router';
import { getCollectionUrl, getNewEntryUrl } from '../lib/urlHelper';

export function searchCollections(query: string, collection: string) {
  if (collection) {
    defaultRouter.push(`/collections/${collection}/search/${query}`);
  } else {
    defaultRouter.push(`/search/${query}`);
  }
}

export function showCollection(collectionName: string) {
  defaultRouter.push(getCollectionUrl(collectionName));
}

export function createNewEntry(collectionName: string) {
  defaultRouter.push(getNewEntryUrl(collectionName));
}
