const SUPPORTED_URL_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'sms:',
  'tel:',
]);

export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
      return 'about:blank';
    }
  } catch {
    return url;
  }
  return url;
}

const SAFE_IMAGE_URL_PROTOCOLS = new Set([
  'http:',
  'https:',
  'data:',
]);

/**
 * Sanitizes a candidate `<img>` `src` value pulled from untrusted content
 * (e.g. pasted clipboard HTML) before it is allowed to reach a Lexical node
 * — and therefore, eventually, a live/rendered `<img>` element.
 *
 * Returns `null` for anything that isn't a safe, resolvable image
 * reference: unparseable strings, and any protocol other than `http:`,
 * `https:`, or a `data:image/*` URI (this rejects `javascript:`, `vbscript:`,
 * `file:`, `blob:`, bare `about:` and similar script/local-file vectors).
 *
 * Relative URLs (e.g. `/media/foo.png`) are preserved as-is (resolved only
 * for protocol validation) so ordinary same-origin media references keep
 * working.
 */
export function sanitizeImageSrc(src: string, base?: string): string | null {
  const trimmed = src.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(
      trimmed,
      base ?? (typeof window !== 'undefined' ? window.location.href : undefined),
    );
  } catch {
    return null;
  }

  if (!SAFE_IMAGE_URL_PROTOCOLS.has(parsed.protocol)) {
    return null;
  }

  if (parsed.protocol === 'data:' && !/^data:image\//i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

// Source: https://stackoverflow.com/a/8234912/2013580
const urlRegExp = new RegExp(
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[\w]*))?)/,
);
export function validateUrl(url: string): boolean {
  // TODO Fix UI for link insertion; it should never default to an invalid URL such as https://.
  // Maybe show a dialog where they user can type the URL before inserting it.
  return url === 'https://' || urlRegExp.test(url);
}
