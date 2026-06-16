import curry from 'lodash/curry';
import flow from 'lodash/flow';
import isString from 'lodash/isString';

function isAbortControllerSupported() {
  if (typeof window !== 'undefined') {
    return !!window.AbortController;
  }
  return false;
}

const timeout = 60;

function fetchWithTimeout(input, init) {
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
    .catch(e => {
      if (e.name === 'AbortError' || e.name === 'DOMException') {
        throw new Error(`Request timed out after ${timeout} seconds`);
      }
      throw e;
    });
}

function decodeParams(paramsString) {
  return Object.fromEntries(paramsString.split('&').map(s => s.split('=').map(decodeURIComponent)));
}

function fromURL(wholeURL) {
  const [url, allParamsString] = wholeURL.split('?');
  return { url, ...(allParamsString ? { params: decodeParams(allParamsString) } : {}) };
}

function fromFetchArguments(wholeURL, options) {
  const base = fromURL(wholeURL);
  if (!options) return base;
  const { url: _url, params: _params, ...rest } = options;
  return { ...base, ...rest };
}

function encodeParams(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function toURL(req) {
  return `${req.url}${req.params ? `?${encodeParams(req.params)}` : ''}`;
}

function toFetchArguments(req) {
  const { url: _url, params: _params, ...fetchOptions } = req;
  return [toURL(req), fetchOptions];
}

function maybeRequestArg(req) {
  if (isString(req)) {
    return fromURL(req);
  }
  if (req) {
    return typeof req === 'object' ? req : fromURL(String(req));
  }
  return {};
}

function ensureRequestArg(func) {
  return req => func(maybeRequestArg(req));
}

function ensureRequestArg2(func) {
  return (arg, req) => func(arg, maybeRequestArg(req));
}

// This actually performs the built request object
const performRequest = ensureRequestArg(req => {
  const args = toFetchArguments(req);
  return fetchWithTimeout(...args);
});

// Each of the following functions takes options and returns another
// function that performs the requested action on a request.
const getCurriedRequestProcessor = flow([ensureRequestArg2, curry]);

function setIn(obj, path, val) {
  if (path.length === 0) return val;
  const [head, ...rest] = path;
  return { ...obj, [head]: rest.length === 0 ? val : setIn(obj[head] ?? {}, rest, val) };
}

function updateIn(obj, path, fn) {
  if (path.length === 0) return fn(obj);
  const [head, ...rest] = path;
  return {
    ...obj,
    [head]: rest.length === 0 ? fn(obj[head]) : updateIn(obj[head] ?? {}, rest, fn),
  };
}

function getPropSetFunction(path) {
  return getCurriedRequestProcessor((val, req) => setIn(req, path, val));
}

function getPropMergeFunction(path) {
  return getCurriedRequestProcessor((obj, req) =>
    updateIn(req, path, (p = {}) => ({ ...p, ...obj })),
  );
}

const withMethod = getPropSetFunction(['method']);
const withBody = getPropSetFunction(['body']);
const withNoCache = getPropSetFunction(['cache'])('no-cache');
const withParams = getPropMergeFunction(['params']);
const withHeaders = getPropMergeFunction(['headers']);

// withRoot sets a root URL, unless the URL is already absolute
const absolutePath = new RegExp('^(?:[a-z]+:)?//', 'i');
const withRoot = getCurriedRequestProcessor((root, req) => {
  const p = req.url;
  let newUrl;
  if (absolutePath.test(p)) {
    newUrl = p;
  } else {
    newUrl =
      root && p && p[0] !== '/' && root[root.length - 1] !== '/' ? `${root}/${p}` : `${root}${p}`;
  }
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
