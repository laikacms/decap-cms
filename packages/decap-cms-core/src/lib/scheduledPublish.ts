/*
 * Client-side storage for scheduled publish times.
 *
 * Scheduling a publish is backend-agnostic: none of the existing backend
 * implementations (git PR/MR label based or metadata based) know about a
 * "publish at" concept, and wiring that into every backend is out of scope
 * for the initial version of this feature (see DCMS-1415). Until a given
 * backend gains native support, the scheduled time is kept in the browser's
 * localStorage, keyed by collection + slug, and is rehydrated onto the
 * editorial workflow entity whenever it is loaded.
 */

const STORAGE_KEY = 'decap-cms.scheduledPublish';

type ScheduledPublishMap = Record<string, string>;

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(collection: string, slug: string) {
  // JSON-encode the pair rather than joining with a plain separator: a naive
  // `${collection}.${slug}` join is ambiguous whenever either value contains a
  // literal `.` (e.g. collection="a.b", slug="c" collides with collection="a",
  // slug="b.c", both producing "a.b.c").
  return JSON.stringify([collection, slug]);
}

function readAll(): ScheduledPublishMap {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScheduledPublishMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: ScheduledPublishMap) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc). Scheduling
    // is a best-effort convenience in that case, not a hard requirement.
  }
}

export function getScheduledPublishAt(collection: string, slug: string): string | undefined {
  return readAll()[storageKey(collection, slug)];
}

export function getAllScheduledPublishes(): ScheduledPublishMap {
  return readAll();
}

export function setScheduledPublishAt(collection: string, slug: string, publishAt: string) {
  const all = readAll();
  all[storageKey(collection, slug)] = publishAt;
  writeAll(all);
}

export function clearScheduledPublishAt(collection: string, slug: string) {
  const all = readAll();
  if (!(storageKey(collection, slug) in all)) return;
  delete all[storageKey(collection, slug)];
  writeAll(all);
}

export function isPublishAtDue(publishAt: string | undefined | null, now: Date = new Date()) {
  if (!publishAt) return false;
  const parsed = new Date(publishAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() <= now.getTime();
}
