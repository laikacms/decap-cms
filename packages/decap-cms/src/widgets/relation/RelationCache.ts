interface CacheEntry {
  collection: string;
  value: unknown;
}

class RelationCache {
  cache: Map<string, CacheEntry>;
  pendingRequests: Map<string, Promise<unknown>>;

  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  async getOptions(
    collection: string,
    searchFields: string[],
    term: string,
    file: string | undefined,
    queryFn: () => Promise<unknown>,
  ): Promise<unknown> {
    const cacheKey = `${collection}-${searchFields.join(',')}-${term || ''}-${file || ''}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)?.value;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const request = queryFn();
    this.pendingRequests.set(cacheKey, request);

    try {
      const result = await request;
      this.cache.set(cacheKey, { collection, value: result });
      this.ensureCacheSize();
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  invalidateCollection(collection: string) {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.collection === collection) {
        this.cache.delete(key);
      }
    }
  }

  ensureCacheSize() {
    const maxSize = 100;
    if (this.cache.size > maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

const relationCache = new RelationCache();

export default relationCache;
