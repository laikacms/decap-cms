import { fromJS, List, Map } from 'immutable';
import curry from 'lodash/curry';
import flow from 'lodash/flow';
import isString from 'lodash/isString';

type ImmutableRequest = Map<string, unknown>;
type RequestInput = string | ImmutableRequest | Record<string, unknown>;

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

function decodeParams(paramsString: string): Map<string, string> {
  return List(paramsString.split('&'))
    .map(s => List(s.split('=')).map(decodeURIComponent))
    .reduce((acc, pair) => acc.set(pair.get(0) || '', pair.get(1) || ''), Map<string, string>());
}

function fromURL(wholeURL: string): ImmutableRequest {
  const [url, allParamsString] = wholeURL.split('?');
  return Map({ url, ...(allParamsString ? { params: decodeParams(allParamsString) } : {}) });
}

function fromFetchArguments(wholeURL: string, options?: RequestInit): ImmutableRequest {
  return fromURL(wholeURL).merge(
    (options ? fromJS(options) : Map()).remove('url').remove('params') as ImmutableRequest,
  );
}

function encodeParams(params: Map<string, string>): string {
  return params
    .entrySeq()
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function toURL(req: ImmutableRequest): string {
  const url = req.get('url') as string;
  const params = req.get('params') as Map<string, string> | undefined;
  return `${url}${params ? `?${encodeParams(params)}` : ''}`;
}

function toFetchArguments(req: ImmutableRequest): [string, RequestInit] {
  return [toURL(req), req.remove('url').remove('params').toJS() as RequestInit];
}

function maybeRequestArg(req: RequestInput): ImmutableRequest {
  if (isString(req)) {
    return fromURL(req);
  }
  if (req) {
    return Map.isMap(req) ? req as ImmutableRequest : fromJS(req) as ImmutableRequest;
  }
  return Map();
}

function ensureRequestArg<T>(func: (req: ImmutableRequest) => T): (req: RequestInput) => T {
  return (req: RequestInput) => func(maybeRequestArg(req));
}

function ensureRequestArg2<A, T>(func: (arg: A, req: ImmutableRequest) => T): (arg: A, req: RequestInput) => T {
  return (arg: A, req: RequestInput) => func(arg, maybeRequestArg(req));
}

// This actually performs the built request object
const performRequest = ensureRequestArg((req: ImmutableRequest) => {
  const args = toFetchArguments(req);
  return fetchWithTimeout(args[0], args[1]);
});

// Each of the following functions takes options and returns another
// function that performs the requested action on a request.
const getCurriedRequestProcessor = flow([ensureRequestArg2, curry]);

function getPropSetFunction(path: string[]) {
  return getCurriedRequestProcessor((val: unknown, req: ImmutableRequest) => req.setIn(path, val));
}

function getPropMergeFunction(path: string[]) {
  return getCurriedRequestProcessor((obj: unknown, req: ImmutableRequest) => 
    req.updateIn(path, (p: unknown = Map()) => (p as Map<string, unknown>).merge(obj as Record<string, unknown>))
  );
}

const withMethod = getPropSetFunction(['method']);
const withBody = getPropSetFunction(['body']);
const withNoCache = getPropSetFunction(['cache'])('no-cache');
const withParams = getPropMergeFunction(['params']);
const withHeaders = getPropMergeFunction(['headers']);

// withRoot sets a root URL, unless the URL is already absolute
const absolutePath = new RegExp('^(?:[a-z]+:)?//', 'i');
const withRoot = getCurriedRequestProcessor((root: string, req: ImmutableRequest) =>
  req.update('url', (p: unknown) => {
    const path = p as string;
    if (absolutePath.test(path)) {
      return path;
    }
    return root && path && path[0] !== '/' && root[root.length - 1] !== '/'
      ? `${root}/${path}`
      : `${root}${path}`;
  }),
);

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
