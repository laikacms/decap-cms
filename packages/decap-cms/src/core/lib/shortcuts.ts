/**
 * Global keyboard shortcut engine. App shells (the default app, host apps)
 * register shortcuts here and the engine owns the single window keydown listener,
 * multi-key chord state ('g' then 'd'), typing suppression, and modal
 * coordination. Mirrors the extension-registry pattern in `./registry`: core
 * owns the mechanism, apps own the policy.
 *
 * Sequences are space-separated keystrokes, each keystroke a '+'-separated
 * combo: `'g d'`, `'mod+s'`, `'mod+shift+p'`, `'?'`, `'escape'`. `mod`
 * matches Cmd on Apple platforms and Ctrl elsewhere (either is accepted, the
 * same tolerance the Cmd+K palette shortcut always had).
 *
 * Coordination seams:
 * - `suspendShortcuts()` pauses everything while a modal surface is open
 *   (dialog components call it automatically); shortcuts registered with
 *   `allowWhileSuspended` (e.g. the palette toggle itself) keep working.
 * - Keystrokes originating inside `[role="dialog"]` / `[aria-modal]` are
 *   ignored even without an explicit suspension, so modals that don't know
 *   about this engine (core's media library) are still safe.
 * - Registering a shortcut with an existing `id` replaces it, letting hosts
 *   override an app-shell default without coordinating removal.
 * - `subscribeToShortcuts` lets help surfaces re-render as hosts register
 *   their own shortcuts.
 */

export interface ShortcutKeystroke {
  /** Normalized (lowercased) `KeyboardEvent.key`. */
  key: string;
  /** Requires Cmd (Apple) / Ctrl; a bare keystroke must have neither. */
  mod: boolean;
  /** Requires Shift. Shift is otherwise ignored, so `'?'` works as-is. */
  shift: boolean;
  /** Requires Alt/Option; a keystroke without it must not have Alt held. */
  alt: boolean;
}

export interface Shortcut {
  /** Unique id; registering the same id again replaces the shortcut. */
  id: string;
  /** E.g. `'g d'`, `'mod+s'`, `'j'`, `'?'`. */
  sequence: string;
  /** Human label for help surfaces ("Go to dashboard"). */
  label: string;
  /** Section heading in help surfaces ("Navigation", "Editor", ...). */
  group?: string | undefined;
  /** Extra enablement gate evaluated per keystroke. */
  when?: () => boolean;
  /**
   * Run even while focus is in an input/textarea/contenteditable. Defaults
   * to true when every keystroke carries `mod`, false otherwise.
   */
  allowInInput?: boolean | undefined;
  /**
   * Run even while shortcuts are suspended or focus is inside a modal.
   * Reserved for toggles that must work from within their own dialog
   * (the command palette's `mod+k`).
   */
  allowWhileSuspended?: boolean | undefined;
  run: (event: KeyboardEvent) => void;
}

/** How long a chord prefix ('g') stays armed waiting for the next key. */
export const SHORTCUT_CHORD_TIMEOUT_MS = 1200;

export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent);
}

export function parseSequence(sequence: string): ShortcutKeystroke[] {
  return sequence
    .trim()
    .split(/\s+/)
    .map(token => {
      const parts = token.split('+');
      // A trailing '+' means the key itself is '+' ('mod++' or bare '+').
      const key = (parts[parts.length - 1] || '+').toLowerCase();
      const modifiers = parts.slice(0, -1).map(part => part.toLowerCase());
      return {
        key,
        mod: modifiers.some(m => m === 'mod' || m === 'cmd' || m === 'ctrl' || m === 'meta'),
        shift: modifiers.includes('shift'),
        alt: modifiers.some(m => m === 'alt' || m === 'option'),
      };
    });
}

/** Presentation chunks for a sequence, one per keystroke: 'mod+s' → ['⌘S']. */
export function formatSequence(sequence: string): string[] {
  const apple = isApplePlatform();
  return parseSequence(sequence).map(ks => {
    const parts: string[] = [];
    if (ks.mod) parts.push(apple ? '⌘' : 'Ctrl');
    if (ks.alt) parts.push(apple ? '⌥' : 'Alt');
    if (ks.shift) parts.push(apple ? '⇧' : 'Shift');
    parts.push(formatKey(ks.key));
    return apple ? parts.join('') : parts.join(' ');
  });
}

function formatKey(key: string): string {
  switch (key) {
    case 'arrowup':
      return '↑';
    case 'arrowdown':
      return '↓';
    case 'arrowleft':
      return '←';
    case 'arrowright':
      return '→';
    case 'enter':
      return '↵';
    case 'escape':
      return 'Esc';
    case ' ':
      return 'Space';
    default:
      return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
  }
}

interface KeystrokeSnapshot {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

function snapshotEvent(event: KeyboardEvent): KeystrokeSnapshot {
  return {
    key: event.key.toLowerCase(),
    mod: event.metaKey || event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
  };
}

function keystrokeMatches(expected: ShortcutKeystroke, actual: KeystrokeSnapshot): boolean {
  if (expected.key !== actual.key) return false;
  if (expected.mod !== actual.mod) return false;
  if (expected.alt !== actual.alt) return false;
  // Shift is only enforced when asked for: many keys ('?', '_') already
  // require Shift to type, and 'J' should behave like 'j'.
  if (expected.shift && !actual.shift) return false;
  return true;
}

/**
 * Duck-typed rather than `instanceof` checks throughout: events can originate
 * in another realm (the editor's preview iframe via `attachShortcutTarget`),
 * where elements are not instances of this window's HTMLElement.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: unknown, isContentEditable?: unknown } | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable === true) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

function isInsideModal(target: EventTarget | null): boolean {
  const el = target as Element | null;
  if (!el || typeof el.closest !== 'function') return false;
  return el.closest('[role="dialog"], [aria-modal="true"], dialog') !== null;
}

function defaultAllowInInput(shortcut: Shortcut): boolean {
  return parseSequence(shortcut.sequence).every(ks => ks.mod);
}

const shortcuts = new Map<string, Shortcut>();
const subscribers = new Set<() => void>();
let snapshot: Shortcut[] | null = null;
let suspendCount = 0;
let listenerAttached = false;
let chordBuffer: KeystrokeSnapshot[] = [];
let chordTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  snapshot = null;
  subscribers.forEach(fn => fn());
}

function clearChord() {
  chordBuffer = [];
  if (chordTimer !== null) {
    clearTimeout(chordTimer);
    chordTimer = null;
  }
}

function armChordTimer() {
  if (chordTimer !== null) clearTimeout(chordTimer);
  chordTimer = setTimeout(() => {
    chordBuffer = [];
    chordTimer = null;
  }, SHORTCUT_CHORD_TIMEOUT_MS);
}

function isEligible(shortcut: Shortcut, suppressed: boolean, inInput: boolean): boolean {
  if (suppressed && !shortcut.allowWhileSuspended) return false;
  if (inInput && !(shortcut.allowInInput ?? defaultAllowInInput(shortcut))) return false;
  if (shortcut.when && !shortcut.when()) return false;
  return true;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  // Bare modifier presses never advance or break a chord.
  if (event.key === 'Shift' || event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt') return;

  const suppressed = suspendCount > 0 || isInsideModal(event.target);
  const inInput = isEditableTarget(event.target);
  const eligible = getRegisteredShortcuts().filter(s => isEligible(s, suppressed, inInput));
  if (eligible.length === 0) {
    clearChord();
    return;
  }

  const stroke = snapshotEvent(event);
  if (!tryDispatch(eligible, [...chordBuffer, stroke], event) && chordBuffer.length > 0) {
    // A broken chord drops the stale prefix and re-reads the key fresh, so
    // 'g' 'g' 'd' still lands on 'g d'.
    clearChord();
    tryDispatch(eligible, [stroke], event);
  }
}

function tryDispatch(eligible: Shortcut[], attempted: KeystrokeSnapshot[], event: KeyboardEvent): boolean {
  let match: Shortcut | undefined;
  let extendsChord = false;
  for (const shortcut of eligible) {
    const seq = parseSequence(shortcut.sequence);
    if (seq.length < attempted.length) continue;
    if (!attempted.every((stroke, i) => keystrokeMatches(seq[i], stroke))) continue;
    if (seq.length === attempted.length) {
      // Last registration wins, so hosts registering later override
      // app-shell defaults that share a sequence.
      match = shortcut;
    } else {
      extendsChord = true;
    }
  }
  if (match) {
    event.preventDefault();
    clearChord();
    match.run(event);
    return true;
  }
  if (extendsChord) {
    event.preventDefault();
    chordBuffer = attempted;
    armChordTimer();
    return true;
  }
  return false;
}

function syncListener() {
  if (typeof window === 'undefined') return;
  const shouldListen = shortcuts.size > 0;
  if (shouldListen && !listenerAttached) {
    window.addEventListener('keydown', onKeyDown);
    listenerAttached = true;
  } else if (!shouldListen && listenerAttached) {
    window.removeEventListener('keydown', onKeyDown);
    listenerAttached = false;
    clearChord();
  }
}

/**
 * Routes a secondary window's keydown events through the engine. The main
 * window is handled automatically; this is for same-origin iframes that
 * swallow keyboard events (the editor's preview pane), so e.g. mod+S saves
 * the entry instead of triggering the browser's "save page" from inside
 * the frame. Returns a detach function.
 */
export function attachShortcutTarget(target: Window): () => void {
  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}

/** Registers a shortcut; returns a dispose function. Same-id registrations replace. */
export function registerShortcut(shortcut: Shortcut): () => void {
  shortcuts.set(shortcut.id, shortcut);
  syncListener();
  emit();
  return () => {
    // Only remove if we're still the current registration for this id; a
    // replacement by a host must survive the original's cleanup.
    if (shortcuts.get(shortcut.id) === shortcut) {
      shortcuts.delete(shortcut.id);
      syncListener();
      emit();
    }
  };
}

/** Registration-ordered list of active shortcuts (stable identity between changes). */
export function getRegisteredShortcuts(): Shortcut[] {
  if (snapshot === null) {
    snapshot = Array.from(shortcuts.values());
  }
  return snapshot;
}

/** Notifies on any register/unregister; for help dialogs and palettes. */
export function subscribeToShortcuts(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/**
 * Pauses all shortcuts (except `allowWhileSuspended` ones) until the returned
 * release function is called. Re-entrant: each suspension must be released.
 */
export function suspendShortcuts(): () => void {
  suspendCount += 1;
  clearChord();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    suspendCount -= 1;
  };
}

/** Test-only: drop all registrations, suspensions, and chord state. */
export function resetShortcutsForTests(): void {
  shortcuts.clear();
  suspendCount = 0;
  clearChord();
  syncListener();
  emit();
}
