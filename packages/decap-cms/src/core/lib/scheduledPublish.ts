/*
 * Client-side storage for scheduled publish times (DCMS-1991).
 *
 * Scheduling a publish is backend-agnostic: none of the existing backend
 * implementations (git PR/MR label based or metadata based) know about a
 * "publish at" concept, and wiring that into every backend is out of scope
 * for this feature. The scheduled time is kept in the browser's
 * localStorage, keyed by collection + slug, and is rehydrated onto the
 * editorial workflow entity whenever it is loaded (see
 * `core/actions/editorialWorkflow.tsx`).
 *
 * IMPORTANT: nothing here executes a publish on a timer server-side. This
 * CMS has no server component of its own, so "run on time" is necessarily
 * best-effort: the actual publish only fires while a browser tab with the
 * CMS open calls `checkScheduledPublishes()` (on load and on an interval).
 * If no tab is open when the scheduled time arrives, the entry publishes
 * the next time someone opens the CMS after that time. Do not present this
 * as a guaranteed/unattended scheduled-publish mechanism.
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

// Dots are legal in collection/slug names, so joining with `.` alone can
// collide (e.g. collection `a.b` slug `c` vs collection `a` slug `b.c`), and
// `encodeURIComponent` doesn't escape `.` either. JSON-encoding the pair
// keeps each part unambiguous regardless of its contents.
function storageKey(collection: string, slug: string) {
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
    // localStorage may be unavailable (private browsing, quota, etc).
    // Scheduling is a best-effort convenience in that case, not a hard
    // requirement.
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

export function isPublishAtDue(
  publishAt: string | undefined | null,
  now: Date = new Date(),
): boolean {
  if (!publishAt) return false;
  const parsed = new Date(publishAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() <= now.getTime();
}
