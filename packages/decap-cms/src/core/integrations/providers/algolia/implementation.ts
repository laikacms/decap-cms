import { flatten } from 'lodash-es';

import { selectEntrySlug } from '@/core/reducers/collections';
import { createEntry } from '@/core/valueObjects/Entry';
import { unsentRequest } from '@/lib/util/index';

import type { EntryValue } from '@/core/valueObjects/Entry';
import type { CmsCollectionState } from '@/lib/util/index';

type Collection = CmsCollectionState;

const { fetchWithTimeout: fetch } = unsentRequest;

export interface AlgoliaConfig {
  applicationID?: string;
  apiKey?: string;
  indexPrefix?: string;
  [key: string]: unknown;
}

interface AlgoliaHit {
  path: string;
  slug: string;
  data: Record<string, unknown>;
}

interface AlgoliaSearchResult {
  hits: AlgoliaHit[];
  page: number;
  nbPages?: number;
}

interface AlgoliaMultiSearchResponse {
  results: AlgoliaSearchResult[];
}

interface EntriesCache {
  collection: Collection | null;
  page: number | null;
  pagination?: number;
  entries: EntryValue[];
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  params?: Record<string, string | number>;
}

function getSlug(path: string): string {
  return (
    path
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '') || ''
  );
}

export default class Algolia {
  config: AlgoliaConfig;
  applicationID: string;
  apiKey: string;
  indexPrefix: string;
  searchURL: string;
  entriesCache: EntriesCache;

  constructor(config: AlgoliaConfig) {
    this.config = config;
    if (config.applicationID == null || config.apiKey == null) {
      throw 'The Algolia search integration needs the credentials (applicationID and apiKey) in the integration configuration.';
    }

    this.applicationID = config.applicationID as string;
    this.apiKey = config.apiKey as string;

    const prefix = config.indexPrefix;
    this.indexPrefix = prefix ? `${prefix}-` : '';

    this.searchURL = `https://${this.applicationID}-dsn.algolia.net/1`;

    this.entriesCache = {
      collection: null,
      page: null,
      entries: [],
    };
  }

  requestHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
      'X-Algolia-API-Key': this.apiKey,
      'X-Algolia-Application-Id': this.applicationID,
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  parseJsonResponse(response: Response): Promise<unknown> {
    return response.json().then(json => {
      if (!response.ok) {
        return Promise.reject(json);
      }

      return json;
    });
  }

  urlFor(path: string, options: RequestOptions): string {
    const params: string[] = [];
    if (options.params) {
      for (const key in options.params) {
        params.push(`${key}=${encodeURIComponent(options.params[key])}`);
      }
    }
    if (params.length) {
      path += `?${params.join('&')}`;
    }
    return path;
  }

  request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const headers = this.requestHeaders(options.headers || {});
    const url = this.urlFor(path, options);
    return fetch(url, { ...options, headers }).then((response: Response) => {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.match(/json/)) {
        return this.parseJsonResponse(response);
      }

      return response.text();
    });
  }

  search(
    collections: string[],
    searchTerm: string,
    page: number,
  ): Promise<{ entries: EntryValue[], pagination: number }> {
    const searchCollections = collections.map(collection => ({
      indexName: `${this.indexPrefix}${collection}`,
      params: `query=${searchTerm}&page=${page}`,
    }));

    return this.request(`${this.searchURL}/indexes/*/queries`, {
      method: 'POST',
      body: JSON.stringify({ requests: searchCollections }),
    }).then(response => {
      const typedResponse = response as AlgoliaMultiSearchResponse;
      const entries = typedResponse.results.map((result, index) =>
        result.hits.map(hit => {
          const slug = getSlug(hit.path);
          return createEntry(collections[index], slug, hit.path, { data: hit.data, partial: true });
        })
      );

      return { entries: flatten(entries), pagination: page };
    });
  }

  searchBy(field: string, collection: string, query: string): Promise<AlgoliaSearchResult> {
    return this.request(`${this.searchURL}/indexes/${this.indexPrefix}${collection}`, {
      params: {
        restrictSearchableAttributes: field,
        query,
      },
    }) as Promise<AlgoliaSearchResult>;
  }

  listEntries(
    collection: Collection,
    page: number,
  ): Promise<{ page?: number, pagination?: number, entries: EntryValue[] }> {
    if (this.entriesCache.collection === collection && this.entriesCache.page === page) {
      return Promise.resolve({ page: this.entriesCache.page, entries: this.entriesCache.entries });
    } else {
      return this.request(`${this.searchURL}/indexes/${this.indexPrefix}${collection.name}`, {
        params: { page },
      }).then(response => {
        const typedResponse = response as AlgoliaSearchResult;
        const entries = typedResponse.hits.map(hit => {
          const slug = selectEntrySlug(collection, hit.path);
          return createEntry(collection.name, slug, hit.path, {
            data: hit.data,
            partial: true,
          });
        });
        this.entriesCache = { collection, pagination: typedResponse.page, page, entries };
        return { entries, pagination: typedResponse.page };
      });
    }
  }

  async listAllEntries(collection: Collection): Promise<EntryValue[]> {
    const params = {
      hitsPerPage: 1000,
    };
    let response = (await this.request(
      `${this.searchURL}/indexes/${this.indexPrefix}${collection.name}`,
      { params },
    )) as AlgoliaSearchResult;
    let { nbPages = 0, hits } = response;
    let page = response.page + 1;
    while (page < nbPages) {
      response = (await this.request(
        `${this.searchURL}/indexes/${this.indexPrefix}${collection.name}`,
        {
          params: { ...params, page },
        },
      )) as AlgoliaSearchResult;
      hits = [...hits, ...response.hits];
      page = page + 1;
    }
    const entries = hits.map(hit => {
      const slug = selectEntrySlug(collection, hit.path);
      return createEntry(collection.name, slug, hit.path, {
        data: hit.data,
        partial: true,
      });
    });

    return entries;
  }

  getEntry(collection: Collection, slug: string): Promise<EntryValue> {
    return this.searchBy('slug', collection.name, slug).then(response => {
      const entry = response.hits.filter(hit => hit.slug === slug)[0];
      return createEntry(collection.name, slug, entry.path, {
        data: entry.data,
        partial: true,
      });
    });
  }
}
