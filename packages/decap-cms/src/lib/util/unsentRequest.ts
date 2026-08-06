import { curry, flow, isString } from 'lodash-es';

export type RequestObject = {
  url: string,
  params?: Record<string, string>,
  method?: string,
  body?: BodyInit,
  headers?: Record<string, string>,
  cache?: RequestCache,
  credentials?: RequestCredentials,
  mode?: RequestMode,
  signal?: AbortSignal,
  [key: string]: unknown,
};

type RequestInput = string | RequestObject | Record<string, unknown>;

function isAbortControllerSupported() {
  if (typeof window !== 'undefined') {
    return !!window.AbortController;
  }
  return false;
}

const timeout = 60;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if ((init && init.signal) || !isAbortControllerSupported()) {
    return fetch(input, init);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
  return fetch(input, { ...init, signal: controller.signal })
    .then(res => {
      clearTimeout(timeoutId);
      return res;
    })
    .catch((e: Error) => {
      if (e.name === 'AbortError' || e.name === 'DOMException') {
        throw new Error(`Request timed out after ${timeout} seconds`);
      }
      throw e;
    });
}

function decodeParams(paramsString: string): Record<string, string> {
  return paramsString.split('&').reduce(
    (acc, pair) => {
      const [k, v] = pair.split('=').map(decodeURIComponent);
      if (k) acc[k] = v ?? '';
      return acc;
    },
    {} as Record<string, string>,
  );
}

function fromURL(wholeURL: string): RequestObject {
  const [url, allParamsString] = wholeURL.split('?');
  return { url, ...(allParamsString ? { params: decodeParams(allParamsString) } : {}) };
}

function fromFetchArguments(wholeURL: string, options?: RequestInit): RequestObject {
  const base = fromURL(wholeURL);
  if (!options) return base;
  const { url: _url, params: _params, ...rest } = options as Record<string, unknown>;
  return { ...base, ...rest };
}

function encodeParams(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function toURL(req: RequestObject): string {
  const { url, params } = req;
  return `${url}${params ? `?${encodeParams(params)}` : ''}`;
}

function toFetchArguments(req: RequestObject): [string, RequestInit] {
  const { url: _url, params: _params, ...fetchOpts } = req;
  return [toURL(req), fetchOpts as RequestInit];
}

function maybeRequestArg(req: RequestInput): RequestObject {
  if (isString(req)) return fromURL(req);
  return req as RequestObject;
}

function ensureRequestArg<T>(func: (req: RequestObject) => T): (req: RequestInput) => T {
  return (req: RequestInput) => func(maybeRequestArg(req));
}

function ensureRequestArg2<A, T>(
  func: (arg: A, req: RequestObject) => T,
): (arg: A, req: RequestInput) => T {
  return (arg: A, req: RequestInput) => func(arg, maybeRequestArg(req));
}

const performRequest = ensureRequestArg((req: RequestObject) => {
  const [url, init] = toFetchArguments(req);
  return fetchWithTimeout(url, init);
});

const getCurriedRequestProcessor = flow([ensureRequestArg2, curry]);

function getPropSetFunction(key: keyof RequestObject) {
  return getCurriedRequestProcessor(
    (val: unknown, req: RequestObject): RequestObject => ({ ...req, [key]: val }),
  );
}

function getPropMergeFunction(key: keyof RequestObject) {
  return getCurriedRequestProcessor(
    (obj: Record<string, unknown>, req: RequestObject): RequestObject => ({
      ...req,
      [key]: { ...((req[key] as Record<string, unknown>) ?? {}), ...obj },
    }),
  );
}

const withMethod = getPropSetFunction('method');
const withBody = getPropSetFunction('body');
const withNoCache = getPropSetFunction('cache')('no-cache');
const withParams = getPropMergeFunction('params');
const withHeaders = getPropMergeFunction('headers');

const absolutePath = new RegExp('^(?:[a-z]+:)?//', 'i');
const withRoot = getCurriedRequestProcessor((root: string, req: RequestObject): RequestObject => {
  const path = req.url;
  if (absolutePath.test(path)) return req;
  const newUrl = root && path && path[0] !== '/' && root[root.length - 1] !== '/'
    ? `${root}/${path}`
    : `${root}${path}`;
  return { ...req, url: newUrl };
});

export default {
  toURL,
  fromURL,
  fromFetchArguments,
  performRequest,
  withMethod,
  withBody,
  withHeaders,
  withParams,
  withRoot,
  withNoCache,
  fetchWithTimeout,
};
