import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Page, Request, Route } from '@playwright/test';

/**
 * Replays the recorded backend API fixtures in `cypress/fixtures/` through
 * Playwright's network interception layer.
 *
 * Each fixture file is an ordered array of request/response pairs captured
 * from a real backend (via the mockserver proxy in `cypress/utils/mock-server.ts`)
 * and sanitized to `owner/repo` + fake tokens. Matching mirrors the old
 * `stubFetch` command in `cypress/support/commands.ts`:
 *
 *  - a recording is consumed exactly once (spliced on match), so stateful
 *    flows replay correctly — e.g. the entries list is empty before a create
 *    and populated after, because those are two distinct recordings;
 *  - URLs match by substring regex with a `ts=<digits>` cache-buster wildcard;
 *  - unmatched requests to known API hosts get a 404 so a drifted request
 *    fails loudly instead of hitting the real network.
 *
 * Unlike the fetch stub this intercepts at the network layer, so redirects
 * need no special-casing: a fulfilled 302 is followed by the browser and the
 * follow-up request matches its own recording.
 */
export interface RecordedRoute {
  url: string;
  method: string;
  status: number;
  headers: Record<string, string>;
  body?: { encoding?: string; content?: string; contentType?: string } | string;
  response?: { encoding?: string; content?: string } | string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'cypress', 'fixtures');
const DIST_DIR = path.join(__dirname, '..', '..', 'dev-test', 'dist');

/** Hosts the recordings cover; unmatched requests to these must not escape. */
const API_HOSTS = [
  'api.github.com',
  'api.bitbucket.org',
  'bitbucket.org',
  'api.media.atlassian.com',
  'gitlab.com',
  'netlify.com',
  's3.amazonaws.com',
];

/** Stored bodies are decoded; these headers would corrupt the fulfilled response. */
const STRIPPED_RESPONSE_HEADERS = ['content-length', 'content-encoding', 'transfer-encoding', 'connection'];

function escapeRegExp(string: string): string {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function matchRoute(recorded: RecordedRoute, request: Request): boolean {
  if (request.method() !== recorded.method) {
    return false;
  }

  // GitLab-era recordings store bodyless requests as `body: null`, GitHub's
  // omit the field; normalize both to undefined to match absent postData.
  const recordedBody = recorded.body ?? undefined;
  let bodyMatch: boolean;
  if (typeof recordedBody === 'object' && recordedBody?.encoding === 'base64') {
    // Binary upload — size matching is good enough (same as the Cypress stub).
    const buffer = request.postDataBuffer();
    bodyMatch =
      !!buffer && buffer.byteLength === Buffer.from(recordedBody.content || '', 'base64').byteLength;
  } else {
    const postData = request.postData() ?? undefined;
    const contentType = request.headers()['content-type'] || '';
    if (postData !== undefined && recordedBody !== undefined && contentType.includes('multipart/form-data')) {
      // Multipart boundaries differ per request; match on shared field content.
      const recordedStr = typeof recordedBody === 'string' ? recordedBody : JSON.stringify(recordedBody);
      bodyMatch = postData
        .split('\r\n')
        .filter(line => line && !line.startsWith('--'))
        .some(line => recordedStr.includes(line));
    } else if (typeof recordedBody === 'string' && postData !== undefined) {
      // Two recording-era artifacts to tolerate:
      //  - default commit-message quotes changed from curly (“…”) to straight
      //    ("…") in v4 — accept the recorded body with either style (escaped
      //    inside JSON string values, bare otherwise);
      //  - commit author dates are the wall-clock instant of the save (both
      //    sides frozen to epoch 0 but with different tick sizes), so
      //    second-precision ISO timestamps are wildcarded like `ts=` in URLs.
      const withTsWildcard = (value: string) =>
        value.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<timestamp>');
      const requestBody = withTsWildcard(postData);
      bodyMatch =
        [
          recordedBody,
          recordedBody.replace(/[“”]/g, '\\"'),
          recordedBody.replace(/[“”]/g, '"'),
        ].some(candidate => requestBody === withTsWildcard(candidate)) ||
        graphqlBodiesEqual(postData, recordedBody);
    } else {
      bodyMatch = postData === recordedBody;
    }
  }
  if (!bodyMatch) {
    return false;
  }

  // The recorded url is path-only; match it as a substring of the full request
  // URL, with a pattern for the `ts=<timestamp>` cache-buster parameter.
  return new RegExp(recordedUrlPattern(recorded)).test(safeDecode(request.url()));
}

/**
 * Regex source matching a recorded URL, tolerating two recording-era artifacts:
 * the `ts=<timestamp>` cache-buster varies per run, and commit messages
 * embedded in URLs (GitLab MR titles) were recorded with curly quotes where
 * v4 now sends straight ones.
 */
function recordedUrlPattern(recorded: RecordedRoute): string {
  return escapeRegExp(safeDecode(recorded.url))
    .replace(/ts=\d{1,15}/, 'ts=\\d{1,15}')
    .replace(/[“”]/g, '["“”]');
}

/**
 * GraphQL request bodies drift on `print()` formatting across graphql-js
 * versions (e.g. v16 dropped the trailing newline), so compare the operation,
 * variables, and a whitespace-collapsed query instead of raw strings.
 */
function graphqlBodiesEqual(a: string, b: string): boolean {
  try {
    // Variables may embed commit messages recorded with curly quotes (the
    // same drift the string-body candidates handle); normalize them in the
    // raw JSON so they parse as regular escaped quotes.
    const parse = (raw: string) => JSON.parse(raw.replace(/[“”]/g, '\\"'));
    const parsedA = parse(a);
    const parsedB = parse(b);
    if (typeof parsedA.query !== 'string' || typeof parsedB.query !== 'string') {
      return false;
    }
    const collapse = (query: string) => query.replace(/\s+/g, ' ').trim();
    return (
      (parsedA.operationName ?? null) === (parsedB.operationName ?? null) &&
      JSON.stringify(parsedA.variables ?? {}) === JSON.stringify(parsedB.variables ?? {}) &&
      collapse(parsedA.query) === collapse(parsedB.query)
    );
  } catch {
    return false;
  }
}

/**
 * Exact-URL variant for the consumed-GET cache: substring matching is fine
 * inside the ordered recording list, but against the cache a short recorded
 * path like `/repos/owner/repo` would match every repo-scoped request and
 * serve garbage. Anchor on the full path+query instead.
 */
function matchesConsumed(recorded: RecordedRoute, request: Request): boolean {
  if (request.method() !== recorded.method) {
    return false;
  }
  const requestUrl = new URL(request.url());
  return new RegExp(`^${recordedUrlPattern(recorded)}$`).test(
    safeDecode(requestUrl.pathname + requestUrl.search),
  );
}

async function fulfillRecorded(route: Route, recorded: RecordedRoute): Promise<void> {
  const headers = Object.fromEntries(
    Object.entries(recorded.headers || {}).filter(
      ([name]) =>
        !STRIPPED_RESPONSE_HEADERS.includes(name.toLowerCase()) &&
        !name.toLowerCase().startsWith('access-control-'),
    ),
  );
  // Recorded CORS headers pin the recording-era origin (localhost:8080);
  // replace them with a permissive policy for whatever origin serves dev-test.
  headers['access-control-allow-origin'] = '*';

  let body: string | Buffer;
  if (recorded.response && typeof recorded.response === 'object' && recorded.response.encoding === 'base64') {
    body = Buffer.from(recorded.response.content || '', 'base64');
  } else {
    body = typeof recorded.response === 'string' ? recorded.response : '';
  }

  await route.fulfill({ status: recorded.status, headers, body });
}

export interface ReplayHandle {
  /** Recordings not yet consumed — useful when diagnosing a hung test. */
  remaining: () => RecordedRoute[];
  /** API requests that had no recording and were answered with a 404. */
  unmatched: () => string[];
}

/**
 * A syntactically valid JWT with `{"exp": 4102444800}` (year 2100). The
 * git-gateway recordings sanitize the GoTrue access token to the literal
 * string "access_token", which the client can't jwt-decode — it would treat
 * the session as expired and issue refresh requests the recordings don't
 * have. Substituting a decodable far-future token keeps the request stream
 * aligned; the token value itself is never matched against.
 */
const FAKE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQxMDI0NDQ4MDB9.fake-signature';

export async function installReplay(page: Page, fixtureName: string): Promise<ReplayHandle> {
  const file = path.join(FIXTURES_DIR, `${fixtureName}.json`);
  const routes: RecordedRoute[] = (
    JSON.parse(await fs.readFile(file, 'utf8')) as RecordedRoute[]
  ).map(route => {
    if (typeof route.response === 'string' && route.response.includes('"access_token":"access_token"')) {
      route.response = route.response.replaceAll(
        '"access_token":"access_token"',
        `"access_token":"${FAKE_JWT}"`,
      );
    }
    return route;
  });
  const consumedGets: { recorded: RecordedRoute; at: number }[] = [];
  const unmatched: string[] = [];

  const trace = !!process.env.REPLAY_TRACE;

  function isIdempotentMethod(method: string): boolean {
    return method === 'GET' || method === 'HEAD';
  }

  // Original stream positions: mutations advance recorded state, so a read
  // must reflect the interval between the last consumed mutation (`floor`)
  // and the next pending one (the ceiling). Leftover read recordings below
  // the floor are stale duplicates the app requested fewer times than the
  // recording; recordings beyond the ceiling describe state that doesn't
  // exist yet.
  const positions = new Map<RecordedRoute, number>(routes.map((r, i) => [r, i]));
  let floor = -1;

  /**
   * Pick the recording for a request. Mutations replay in recorded order
   * (earliest match). Reads take the earliest match inside the current state
   * interval (floor, ceiling); the caller falls back to the consumed-GET
   * cache, then to any remaining match, when the interval has none.
   */
  function findRecording(request: Request, anyPosition = false): number {
    if (!isIdempotentMethod(request.method()) || anyPosition) {
      return routes.findIndex(recorded => matchRoute(recorded, request));
    }
    // The ceiling is the SECOND pending mutation: the app may interleave a
    // state read with the mutation the recording sequenced just before it
    // (e.g. refreshing a listing between a recorded merge and branch-delete),
    // so a read may look one pending mutation ahead — but never further.
    const pending = routes.filter(recorded => !isIdempotentMethod(recorded.method));
    const ceiling = pending[1] ? positions.get(pending[1])! : Number.POSITIVE_INFINITY;
    return routes.findIndex(recorded => {
      const pos = positions.get(recorded)!;
      return pos > floor && pos < ceiling && matchRoute(recorded, request);
    });
  }

  function consume(index: number): RecordedRoute {
    const recorded = routes.splice(index, 1)[0];
    if (!isIdempotentMethod(recorded.method)) {
      floor = Math.max(floor, positions.get(recorded)!);
    }
    return recorded;
  }

  await page.route('**/*', async route => {
    const request = route.request();
    const idempotent = isIdempotentMethod(request.method());
    const index = findRecording(request);
    const cached = idempotent
      ? consumedGets.find(c => matchesConsumed(c.recorded, request))
      : undefined;
    if (index >= 0) {
      const recorded = consume(index);
      if (trace) {
        console.log(`[replay] ${request.method()} ${request.url().slice(0, 120)} -> "${recorded.url.slice(0, 100)}" (${recorded.status})`);
      }
      if (idempotent) {
        consumedGets.unshift({ recorded, at: Date.now() });
      }
      await fulfillRecorded(route, recorded);
    } else if (cached) {
      // The app re-reads a resource more often than the recording did; the
      // last served response for the identical URL is still the current state.
      if (trace) {
        console.log(`[replay] ${request.method()} ${request.url().slice(0, 120)} -> cached repeat`);
      }
      await fulfillRecorded(route, cached.recorded);
    } else if (idempotent && findRecording(request, true) >= 0) {
      // Nothing in the current state interval and nothing cached: serve (and
      // consume) any remaining recording rather than failing the read.
      const recorded = consume(findRecording(request, true));
      if (trace) {
        console.log(`[replay] ${request.method()} ${request.url().slice(0, 120)} -> "${recorded.url.slice(0, 100)}" (${recorded.status}, out of interval)`);
      }
      consumedGets.unshift({ recorded, at: Date.now() });
      await fulfillRecorded(route, recorded);
    } else if (request.method() === 'OPTIONS' && API_HOSTS.some(host => request.url().includes(host))) {
      // Recordings predate CORS preflights against this origin; answer them
      // permissively so the real (recorded) request follows.
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
          'access-control-allow-headers':
            request.headers()['access-control-request-headers'] || '*',
        },
      });
    } else if (API_HOSTS.some(host => request.url().includes(host))) {
      unmatched.push(`${request.method()} ${request.url()}`);
      const body = request.postData();
      console.warn(
        `[replay] no recording for ${request.method()} ${request.url()}${
          body ? ` body=${body.slice(0, 300)}` : ''
        }, returning 404`,
      );
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    } else {
      await route.fallback();
    }
  });

  return { remaining: () => [...routes], unmatched: () => [...unmatched] };
}

/**
 * The per-backend pages in `dev-test/backends/<backend>/index.html` reference
 * `dist/decap-cms.js` relative to themselves (they were written to be copied
 * into `dev-test/` root by the Cypress setup). Serve those asset requests from
 * the real `dev-test/dist/` build instead of copying files around.
 */
export async function serveAppBundle(page: Page): Promise<void> {
  await page.route('**/backends/*/dist/*', async route => {
    const filename = new URL(route.request().url()).pathname.split('/').pop()!;
    try {
      await route.fulfill({ path: path.join(DIST_DIR, filename) });
    } catch {
      await route.fulfill({ status: 404, body: '' });
    }
  });
}
