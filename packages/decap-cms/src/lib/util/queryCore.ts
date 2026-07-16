/**
 * Query coordinator for backend requests.
 *
 * Values live in the Redux store (or in the caller's hands); this module only tracks
 * request lifecycles so that concurrent identical requests share one promise, results
 * are considered fresh for a TTL window, and writes can invalidate reads by tag.
 * Optionally retains resolved values (bounded) for callers without a store slice,
 * such as relation option lookups.
 */

const DEFAULT_TTL = 30_000;
const MAX_KEPT_VALUES = 100;

export type Freshness = 'fresh' | 'stale' | 'missing';

export interface FetchOptions {
  /** Tags this query belongs to, e.g. `collection:posts`. Invalidated as a group. */
  tags?: string[];
  /** Freshness window in ms. Defaults to 30s. */
  ttl?: number;
  /**
   * Retain the resolved value and return it for calls within the freshness window.
   * Only for queries whose results do not land in the Redux store.
   */
  keepValue?: boolean;
}

export class QueryCore {
  private inFlight = new Map<string, Promise<unknown>>();
  private fetchedAt = new Map<string, number>();
  private ttls = new Map<string, number>();
  private values = new Map<string, unknown>();
  private keyTags = new Map<string, Set<string>>();

  freshness(key: string): Freshness {
    const at = this.fetchedAt.get(key);
    if (at === undefined) return 'missing';
    const ttl = this.ttls.get(key) ?? DEFAULT_TTL;
    return Date.now() - at < ttl ? 'fresh' : 'stale';
  }

  isFresh(key: string): boolean {
    return this.freshness(key) === 'fresh';
  }

  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /** Returns the retained value for a fresh `keepValue` query, else undefined. */
  getValue<T>(key: string): T | undefined {
    if (!this.isFresh(key)) return undefined;
    return this.values.get(key) as T | undefined;
  }

  /**
   * Run `fn` unless an identical request is already in flight (the pending promise is
   * shared) or, for `keepValue` queries, a fresh value is retained. On success the key
   * is marked fresh; on failure all freshness state for the key is cleared so the next
   * call retries.
   */
  fetch<T>(key: string, fn: () => Promise<T>, options: FetchOptions = {}): Promise<T> {
    const pending = this.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    if (options.keepValue && this.isFresh(key) && this.values.has(key)) {
      return Promise.resolve(this.values.get(key) as T);
    }

    const request = (async () => {
      try {
        const result = await fn();
        this.recordSuccess(key, options, result);
        return result;
      } catch (err) {
        this.invalidateKey(key);
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, request);
    return request;
  }

  invalidateKey(key: string) {
    this.fetchedAt.delete(key);
    this.ttls.delete(key);
    this.values.delete(key);
    this.keyTags.delete(key);
  }

  invalidateTags(tags: string[]) {
    if (tags.length === 0) return;
    for (const [key, keyTags] of this.keyTags.entries()) {
      if (tags.some(tag => keyTags.has(tag))) {
        this.invalidateKey(key);
      }
    }
  }

  clear() {
    this.inFlight.clear();
    this.fetchedAt.clear();
    this.ttls.clear();
    this.values.clear();
    this.keyTags.clear();
  }

  private recordSuccess(key: string, options: FetchOptions, result: unknown) {
    this.fetchedAt.set(key, Date.now());
    if (options.ttl !== undefined) this.ttls.set(key, options.ttl);
    else this.ttls.delete(key);
    this.keyTags.set(key, new Set(options.tags ?? []));
    if (options.keepValue) {
      this.values.set(key, result);
      this.ensureValueCap();
    } else {
      this.values.delete(key);
    }
  }

  private ensureValueCap() {
    while (this.values.size > MAX_KEPT_VALUES) {
      const oldest = this.values.keys().next().value;
      if (oldest === undefined) return;
      this.invalidateKey(oldest);
    }
  }
}

/** Tag helpers so call sites agree on naming. */
export function collectionTag(collection: string) {
  return `collection:${collection}`;
}

export function entryTag(collection: string, slug: string) {
  return `entry:${collection}/${slug}`;
}

export const MEDIA_TAG = 'media';
export const UNPUBLISHED_TAG = 'unpublished';

const queryCore = new QueryCore();

export default queryCore;
