/**
 * Detection and visualization helpers for Unicode bidirectional (bidi) control
 * characters (U+061C, U+202A-U+202E, U+2066-U+2069).
 *
 * These characters can reorder the *visual* rendering of surrounding text
 * without changing the underlying code points, which is the basis of the
 * "Trojan Source" spoofing technique (CVE-2021-42574): a string that reads
 * one way in a plain-text/logical view can render completely differently in
 * a UI. See DCMS-415 / DCMS-429.
 *
 * Widgets use these helpers to warn editors and to visualize the controls
 * in previews, WITHOUT silently stripping or otherwise mutating the
 * editor-authored value.
 *
 * NOTE: the control characters are constructed exclusively via
 * `String.fromCharCode` / hex code points (never as literal invisible
 * characters embedded in source) so this file itself can never become an
 * unintentional Trojan-Source vector.
 */

export const ALM = String.fromCharCode(0x061c);
export const LRE = String.fromCharCode(0x202a);
export const RLE = String.fromCharCode(0x202b);
export const PDF = String.fromCharCode(0x202c);
export const LRO = String.fromCharCode(0x202d);
export const RLO = String.fromCharCode(0x202e);
export const LRI = String.fromCharCode(0x2066);
export const RLI = String.fromCharCode(0x2067);
export const FSI = String.fromCharCode(0x2068);
export const PDI = String.fromCharCode(0x2069);

export const BIDI_CONTROL_NAMES: Record<string, string> = {
  [ALM]: 'ALM',
  [LRE]: 'LRE',
  [RLE]: 'RLE',
  [PDF]: 'PDF',
  [LRO]: 'LRO',
  [RLO]: 'RLO',
  [LRI]: 'LRI',
  [RLI]: 'RLI',
  [FSI]: 'FSI',
  [PDI]: 'PDI',
};

const BIDI_CONTROL_CODEPOINTS = [
  0x061c,
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e,
  0x2066,
  0x2067,
  0x2068,
  0x2069,
];

// Kept as a fresh RegExp per call site so callers can't be bitten by shared
// `lastIndex` state when using the global flag.
export function getBidiControlRegex() {
  const alt = BIDI_CONTROL_CODEPOINTS.map(cp => `\\u${cp.toString(16).padStart(4, '0')}`).join('');
  return new RegExp(`[${alt}]`, 'g');
}

/**
 * Returns true if `value` contains one or more Unicode bidi control
 * characters.
 */
export function containsBidiControls(value: unknown): boolean {
  if (typeof value !== 'string' || !value) {
    return false;
  }
  return getBidiControlRegex().test(value);
}

/**
 * A contiguous run of `value` that is either plain text (`control` is
 * `undefined`) or a single bidi control character (`control` holds its
 * short Unicode name, e.g. `"RLO"`).
 */
export interface BidiSegment {
  text: string;
  control?: string;
}

/**
 * Splits `value` into segments, isolating each bidi control character into
 * its own segment so callers (e.g. preview renderers) can highlight them
 * without altering the surrounding text.
 */
export function splitOnBidiControls(value: unknown): BidiSegment[] {
  if (typeof value !== 'string' || !value) {
    return [{ text: typeof value === 'string' ? value : '' }];
  }

  const segments: BidiSegment[] = [];
  const regex = getBidiControlRegex();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value))) {
    if (match.index > lastIndex) {
      segments.push({ text: value.slice(lastIndex, match.index) });
    }
    segments.push({ text: match[0], control: BIDI_CONTROL_NAMES[match[0]] || 'BIDI' });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    segments.push({ text: value.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text: value }];
}

/**
 * Renders `value` as plain text with bidi controls replaced by their
 * visible named form, e.g. `"admin‮txt.exe"` -> `"admin<RLO>txt.exe"`.
 * Useful for logs, notifications, and non-JSX contexts.
 */
export function visualizeBidiControls(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return typeof value === 'string' ? value : '';
  }
  return value.replace(getBidiControlRegex(), ch => `<${BIDI_CONTROL_NAMES[ch] || 'BIDI'}>`);
}

/**
 * Removes all bidi control characters from `value`. Not used by default in
 * the widget UI (which prefers warning/visualizing over mutating
 * editor-authored content) but exposed for opt-in, collection-level
 * sanitization.
 */
export function stripBidiControls(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return typeof value === 'string' ? value : '';
  }
  return value.replace(getBidiControlRegex(), '');
}
