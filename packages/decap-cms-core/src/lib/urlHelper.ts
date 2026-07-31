import url from 'url';
import urlJoin from 'url-join';
import diacritics from 'diacritics';
import sanitizeFilename from 'sanitize-filename';
import isString from 'lodash/isString';
import escapeRegExp from 'lodash/escapeRegExp';
import flow from 'lodash/flow';
import partialRight from 'lodash/partialRight';

import type { CmsSlug } from '../types/redux';

function getUrl(urlString: string, direct?: boolean) {
  return `${direct ? '/#' : ''}${urlString}`;
}

export function getCollectionUrl(collectionName: string, direct?: boolean) {
  return getUrl(`/collections/${collectionName}`, direct);
}

export function getNewEntryUrl(collectionName: string, direct?: boolean) {
  return getUrl(`/collections/${collectionName}/new`, direct);
}

export function addParams(urlString: string, params: Record<string, string>) {
  const parsedUrl = url.parse(urlString, true);
  parsedUrl.query = { ...parsedUrl.query, ...params };
  return url.format(parsedUrl);
}

export function stripProtocol(urlString: string) {
  const protocolEndIndex = urlString.indexOf('//');
  return protocolEndIndex > -1 ? urlString.slice(protocolEndIndex + 2) : urlString;
}

/* See https://www.w3.org/International/articles/idn-and-iri/#path.
 * According to the new IRI (Internationalized Resource Identifier) spec, RFC 3987,
 *   ASCII chars should be kept the same way as in standard URIs (letters digits _ - . ~).
 * Non-ASCII chars (unless they are not in the allowed "ucschars" list) should be percent-encoded.
 * If the string is not encoded in Unicode, it should be converted to UTF-8 and normalized first,
 *   but JS stores strings as UTF-16/UCS-2 internally, so we should not normalize or re-encode.
 */
const uriChars = /[\w\-.~]/i;
const ucsChars =
  /[\xA0-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFEF}\u{10000}-\u{1FFFD}\u{20000}-\u{2FFFD}\u{30000}-\u{3FFFD}\u{40000}-\u{4FFFD}\u{50000}-\u{5FFFD}\u{60000}-\u{6FFFD}\u{70000}-\u{7FFFD}\u{80000}-\u{8FFFD}\u{90000}-\u{9FFFD}\u{A0000}-\u{AFFFD}\u{B0000}-\u{BFFFD}\u{C0000}-\u{CFFFD}\u{D0000}-\u{DFFFD}\u{E1000}-\u{EFFFD}]/u;

function validURIChar(char: string) {
  return uriChars.test(char);
}

function validIRIChar(char: string) {
  return uriChars.test(char) || ucsChars.test(char);
}

export function getCharReplacer(
  encoding: string,
  options: {
    replacement: NonNullable<CmsSlug['sanitize_replacement']>;
    preserveSlashes?: boolean;
  },
) {
  const { replacement, preserveSlashes } = options;
  let validChar: (char: string) => boolean;

  if (encoding === 'unicode') {
    validChar = validIRIChar;
  } else if (encoding === 'ascii') {
    validChar = validURIChar;
  } else {
    throw new Error('`options.encoding` must be "unicode" or "ascii".');
  }

  // Check and make sure the replacement character is actually a safe char itself.
  if (!Array.from(replacement).every(validChar)) {
    throw new Error('The replacement character(s) (options.replacement) is itself unsafe.');
  }

  return (char: string, i = 0, arr: string[] = [char]) => {
    if (preserveSlashes && char === '/' && i !== 0 && i !== arr.length - 1) {
      return char;
    }

    return validChar(char) ? char : replacement;
  };
}
// `sanitizeURI` does not actually URI-encode the chars (that is the browser's and server's job), just removes the ones that are not allowed.
export function sanitizeURI(
  str: string,
  options?: {
    replacement: CmsSlug['sanitize_replacement'];
    encoding: CmsSlug['encoding'];
    preserveSlashes?: boolean;
  },
) {
  // Default matches decapcms.org docs (DCMS-306, DCMS-395)
  const { replacement = '-', encoding = 'unicode', preserveSlashes } = options || {};

  if (!isString(str)) {
    throw new Error('The input slug must be a string.');
  }
  if (!isString(replacement)) {
    throw new Error('`options.replacement` must be a string.');
  }

  // `Array.from` must be used instead of `String.split` because
  //   `split` converts things like emojis into UTF-16 surrogate pairs.
  return Array.from(str).map(getCharReplacer(encoding, { replacement, preserveSlashes })).join('');
}

export function sanitizeChar(char: string, options?: CmsSlug) {
  // Default matches decapcms.org docs (DCMS-306, DCMS-395)
  const { encoding = 'unicode', sanitize_replacement: replacement = '-' } = options || {};
  return getCharReplacer(encoding, { replacement })(char);
}

// DCMS-1669: without a length cap, an arbitrarily long title produces an
// equally long slug that real backends reject (GitHub's create-file API
// returns 422 above 255 UTF-8 bytes; most filesystems enforce a 255-byte
// NAME_MAX), even though the demo/test-repo backend accepts it silently.
// 100 matches the value documented on decapcms.org for `slug.max_length`.
export const DEFAULT_SLUG_MAX_LENGTH = 100;
// Hard ceiling regardless of `max_length` config, matching the common
// filesystem NAME_MAX (255 bytes); protects against misconfiguration.
const SLUG_MAX_LENGTH_CEILING = 255;

function truncateSlugSegment(segment: string, maxLength: number, replacement: string) {
  if (segment.length <= maxLength) {
    return segment;
  }

  const trailingReplacement = new RegExp(`${escapeRegExp(replacement)}+$`);
  return segment.slice(0, maxLength).replace(trailingReplacement, '');
}

export function sanitizeSlug(str: string, options?: CmsSlug, preserveSlashes?: boolean) {
  if (!isString(str)) {
    throw new Error('The input slug must be a string.');
  }

  const {
    encoding,
    clean_accents: stripDiacritics,
    // Default matches decapcms.org docs (DCMS-306)
    sanitize_replacement: replacement = '-',
    max_length: maxLength = DEFAULT_SLUG_MAX_LENGTH,
  } = options || {};

  const effectiveMaxLength = Math.min(maxLength, SLUG_MAX_LENGTH_CEILING);

  const sanitizedSlug = flow([
    ...(stripDiacritics ? [diacritics.remove] : []),
    partialRight(sanitizeURI, { replacement, encoding, preserveSlashes }),
    preserveSlashes
      ? (slug: string) =>
          slug
            .split('/')
            .filter(Boolean)
            .map(part => sanitizeFilename(part, { replacement }))
            .join('/')
      : partialRight(sanitizeFilename, { replacement }),
  ])(str);

  // Remove any doubled or leading/trailing replacement characters (that were added in the sanitizers).
  const doubleReplacement = new RegExp(`(?:${escapeRegExp(replacement)})+`, 'g');
  const trailingReplacement = new RegExp(`${escapeRegExp(replacement)}$`);
  const leadingReplacement = new RegExp(`^${escapeRegExp(replacement)}`);

  const normalizedSlug: string = sanitizedSlug
    .replace(doubleReplacement, replacement)
    .replace(leadingReplacement, '')
    .replace(trailingReplacement, '');

  // Cap the output length so it stays within what real backends accept
  // (see DCMS-1669). When slashes are preserved (segment-based slugs), the
  // cap applies per path segment rather than to the joined path as a whole.
  if (preserveSlashes) {
    return normalizedSlug
      .split('/')
      .map(segment => truncateSlugSegment(segment, effectiveMaxLength, replacement))
      .join('/');
  }

  return truncateSlugSegment(normalizedSlug, effectiveMaxLength, replacement);
}

export function joinUrlPath(base: string, ...path: string[]) {
  return urlJoin(base, ...path);
}

// DCMS-1792: history v4's hash history runs `decodeURI` on the full
// pathname after every `history.push`/route change. `decodeURI` decodes
// every percent-escape EXCEPT the ones whose decoded character is
// URI-reserved (`; / ? : @ & = + $ , #`) — those are left as literal
// `%XX` text. React Router's `matchPath` (v5, used here) then reads the
// matched `:searchTerm` segment as-is, with no second `decodeURIComponent`
// pass. So a plain `encodeURIComponent(term)` round-trips through the
// router for every character except the reserved ones, which arrive at
// the app as literal `%3B`/`%2F`/`%3F`/`%3A`/`%40`/`%26`/`%3D`/`%2B`/`%24`/
// `%2C`/`%23` text instead of the original character. `decodeSearchTerm`
// finishes that decode on the consuming side; it must NOT use
// `decodeURIComponent` on the whole string, since by this point any other
// `%` characters are already-decoded literal text (e.g. from a search
// query that itself contained a literal `%`) and may not form valid
// percent-escapes, which would throw.
const RESERVED_URI_CHAR_ESCAPES = /%(3B|2F|3F|3A|40|26|3D|2B|24|2C|23)/gi;

export function encodeSearchTerm(term: string): string {
  return encodeURIComponent(term);
}

export function decodeSearchTerm(term: string): string {
  return term.replace(RESERVED_URI_CHAR_ESCAPES, (_match, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}
