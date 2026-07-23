/**
 * Produces a filesystem-safe filename from arbitrary input.
 *
 * Handles:
 *  - Characters forbidden by Windows, macOS, and Linux (/ ? < > \ : * | ")
 *  - ASCII control characters (0x00–0x1F) and Latin-1 control range (0x80–0x9F)
 *  - Unicode bidi format controls, zero-width characters, and the BOM
 *    (Trojan-Source spoofing vector — see FORMAT_CODES below)
 *  - Windows reserved device names (CON, PRN, AUX, NUL, COM0–9, LPT0–9)
 *  - Names consisting entirely of dots (e.g. ".", "..")
 *  - Trailing dots and spaces (invalid on NTFS/FAT)
 *  - Filenames exceeding 255 UTF-8 bytes (the common FS limit)
 */

export interface SanitizeOptions {
  /** Character(s) to substitute for unsafe characters. Defaults to empty string (removal). */
  replacement?: string;
}

/** Characters that are not allowed in filenames on major operating systems. */
const UNSAFE_CHARS = /[/<>?\\:*|"]/g;

/**
 * C0 control codes (U+0000–U+001F) and C1 control codes (U+0080–U+009F).
 * Built via RegExp constructor to avoid eslint no-control-regex violations.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CODES = new RegExp('[\\x00-\\x1f\\x80-\\x9f]', 'g');

/**
 * Unicode bidi format controls, zero-width characters, and the BOM.
 * These are invisible or directionality-altering (Cf category) and are never
 * safe to embed in a filename: they enable "Trojan Source"-style spoofing in
 * file listings, git logs, and PR diffs (CVE-2021-42574 class), and zero-width
 * joiners can make visually distinct filenames byte-identical or vice versa.
 *
 *  - U+200B–U+200F: zero width space/non-joiner/joiner, LTR/RTL marks
 *  - U+202A–U+202E: LTR/RTL embedding, pop directional formatting, LTR/RTL override
 *  - U+2066–U+2069: LTR/RTL/first-strong isolate, pop directional isolate
 *  - U+FEFF: byte order mark / zero width no-break space
 */
const FORMAT_CODES = new RegExp(
  '[\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]',
  'g',
);

/** A name made up of only dots is reserved on Unix-like systems. */
const DOTS_ONLY = /^\.+$/;

/** Windows device names, optionally followed by an extension. Case-insensitive. */
const WINDOWS_DEVICE_NAME = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;

/** Maximum filename length in UTF-8 bytes (ext4, NTFS, HFS+ all use 255). */
const MAX_BYTE_LENGTH = 255;

/**
 * Compute the byte length of a string when encoded as UTF-8.
 * Uses TextEncoder when available (all modern runtimes), otherwise
 * falls back to manual calculation.
 */
const utf8ByteLength: (text: string) => number = (() => {
  if (typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder();
    return (text: string) => encoder.encode(text).byteLength;
  }
  // Manual UTF-8 byte counting for environments without TextEncoder
  return (text: string) => {
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.codePointAt(i)!;
      if (code <= 0x7f) bytes += 1;
      else if (code <= 0x7ff) bytes += 2;
      else if (code <= 0xffff) bytes += 3;
      else {
        bytes += 4;
        i++; // skip the low surrogate
      }
    }
    return bytes;
  };
})();

/**
 * Trim a string so it fits within `limit` UTF-8 bytes.
 * Splits on full Unicode code points — never in the middle of a surrogate pair.
 */
function trimToByteLimit(value: string, limit: number): string {
  if (utf8ByteLength(value) <= limit) return value;

  let accumulated = 0;
  let end = 0;

  while (end < value.length) {
    const cp = value.codePointAt(end)!;
    const charSize = cp > 0xffff ? 4 : cp > 0x7ff ? 3 : cp > 0x7f ? 2 : 1;
    if (accumulated + charSize > limit) break;
    accumulated += charSize;
    end += cp > 0xffff ? 2 : 1; // advance past surrogate pair when needed
  }

  return value.slice(0, end);
}

/**
 * Remove trailing dots and spaces without using a regex
 * (avoids potential quadratic backtracking — CWE-1333).
 */
function stripTrailing(value: string, substitute: string): string {
  let end = value.length;
  while (end > 0 && (value[end - 1] === '.' || value[end - 1] === ' ')) {
    end--;
  }
  return end < value.length ? value.slice(0, end) + substitute : value;
}

/**
 * Core cleaning pass: replace all unsafe patterns with the given substitute.
 */
function clean(raw: string, substitute: string): string {
  let result = raw
    .replace(UNSAFE_CHARS, substitute)
    .replace(CONTROL_CODES, substitute)
    .replace(FORMAT_CODES, substitute)
    .replace(DOTS_ONLY, substitute)
    .replace(WINDOWS_DEVICE_NAME, substitute);

  result = stripTrailing(result, substitute);
  return trimToByteLimit(result, MAX_BYTE_LENGTH);
}

/**
 * Produce a safe filename from the given input string.
 *
 * When a non-empty `replacement` is specified, the function runs two passes:
 * first replacing unsafe characters with the replacement, then stripping any
 * remaining unsafe characters that the replacement itself may have introduced.
 */
export default function sanitizeFilename(input: string, options?: SanitizeOptions): string {
  if (typeof input !== 'string') {
    throw new TypeError('Expected a string as filename input');
  }

  const substitute = options?.replacement ?? '';
  const result = clean(input, substitute);

  // If a non-empty replacement was used, do a second pass with empty string
  // to ensure the replacement characters themselves didn't introduce anything unsafe.
  return substitute.length > 0 ? clean(result, '') : result;
}
