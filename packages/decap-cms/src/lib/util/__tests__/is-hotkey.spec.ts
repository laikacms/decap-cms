import { describe, expect, it } from 'vitest';

import isHotkey, {
  compareHotkey,
  isCodeHotkey,
  isHotkey as isHotkeyNamed,
  isKeyHotkey,
  parseHotkey,
  toKeyCode,
  toKeyName,
} from '@/lib/util/is-hotkey';

// `mod` resolves to `meta` on Mac and `control` elsewhere, based on
// `window.navigator.platform` at module load time (jsdom default is not a Mac
// platform string, so `mod` resolves to `control` in this test environment).
const IS_MAC = /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
const MOD_MODIFIER = IS_MAC ? 'metaKey' : 'ctrlKey';

describe('is-hotkey', () => {
  describe('toKeyName', () => {
    it('lowercases the input', () => {
      expect(toKeyName('ENTER')).toEqual('enter');
    });

    it('resolves known aliases', () => {
      expect(toKeyName('esc')).toEqual('escape');
      expect(toKeyName('cmd')).toEqual('meta');
      expect(toKeyName('ctrl')).toEqual('control');
      expect(toKeyName('return')).toEqual('enter');
      expect(toKeyName('space')).toEqual(' ');
      expect(toKeyName('left')).toEqual('arrowleft');
    });

    it('leaves unaliased names untouched', () => {
      expect(toKeyName('a')).toEqual('a');
    });
  });

  describe('toKeyCode', () => {
    it('returns known key codes', () => {
      expect(toKeyCode('enter')).toEqual(13);
      expect(toKeyCode('escape')).toEqual(27);
      expect(toKeyCode('backspace')).toEqual(8);
    });

    it('resolves aliases before looking up the code', () => {
      expect(toKeyCode('esc')).toEqual(27);
      expect(toKeyCode('return')).toEqual(13);
    });

    it('generates function key codes f1-f19', () => {
      expect(toKeyCode('f1')).toEqual(112);
      expect(toKeyCode('f19')).toEqual(130);
    });

    it('falls back to the uppercase char code for single letters', () => {
      expect(toKeyCode('a')).toEqual('A'.charCodeAt(0));
      expect(toKeyCode('z')).toEqual('Z'.charCodeAt(0));
    });
  });

  describe('parseHotkey', () => {
    it('parses a single letter into a `which` code with all modifiers false', () => {
      const result = parseHotkey('a');

      expect(result).toEqual({
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        which: 'A'.charCodeAt(0),
      });
    });

    it('parses a single modifier combo (ctrl+s)', () => {
      const result = parseHotkey('ctrl+s');

      expect(result).toEqual({
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        which: 'S'.charCodeAt(0),
      });
    });

    it('parses multiple modifiers combined (shift+ctrl+alt+meta+a)', () => {
      const result = parseHotkey('shift+ctrl+alt+meta+a');

      expect(result).toEqual({
        altKey: true,
        ctrlKey: true,
        metaKey: true,
        shiftKey: true,
        which: 'A'.charCodeAt(0),
      });
    });

    it('resolves the `mod` alias per-platform', () => {
      const result = parseHotkey('mod+s');

      expect(result[MOD_MODIFIER]).toEqual(true);
      expect(result.which).toEqual('S'.charCodeAt(0));
    });

    it('resolves modifier aliases (cmd, ctl, opt, option, win, command, windows)', () => {
      expect(parseHotkey('cmd+s').metaKey).toEqual(true);
      expect(parseHotkey('ctl+s').ctrlKey).toEqual(true);
      expect(parseHotkey('opt+s').altKey).toEqual(true);
      expect(parseHotkey('option+s').altKey).toEqual(true);
      expect(parseHotkey('win+s').metaKey).toEqual(true);
      expect(parseHotkey('command+s').metaKey).toEqual(true);
      expect(parseHotkey('windows+s').metaKey).toEqual(true);
    });

    it('resolves key aliases (esc, del, return, space, arrows)', () => {
      expect(parseHotkey('esc').which).toEqual(toKeyCode('escape'));
      expect(parseHotkey('del').which).toEqual(toKeyCode('delete'));
      expect(parseHotkey('return').which).toEqual(toKeyCode('enter'));
      expect(parseHotkey('space').which).toEqual(toKeyCode(' '));
      expect(parseHotkey('left').which).toEqual(toKeyCode('arrowleft'));
      expect(parseHotkey('up').which).toEqual(toKeyCode('arrowup'));
    });

    it('marks a trailing `?` modifier as optional (null instead of true)', () => {
      const result = parseHotkey('shift?+a');

      expect(result.shiftKey).toBeNull();
      expect(result.which).toEqual('A'.charCodeAt(0));
    });

    it('handles the `++` special case for the literal add/plus key', () => {
      const result = parseHotkey('ctrl+add');
      const doublePlus = parseHotkey('ctrl++');

      expect(result.ctrlKey).toEqual(true);
      expect(result.which).toEqual(toKeyCode('add'));
      expect(doublePlus).toEqual(result);
    });

    it('produces a `key` field instead of `which` when byKey is set', () => {
      const result = parseHotkey('ctrl+s', { byKey: true });

      expect(result.ctrlKey).toEqual(true);
      expect(result.key).toEqual('s');
      expect(result.which).toBeUndefined();
    });

    it('throws for an unknown modifier/key name', () => {
      expect(() => parseHotkey('bogus+s')).toThrow(TypeError);
      expect(() => parseHotkey('bogus+s')).toThrow(/Unknown modifier/);
    });
  });

  describe('compareHotkey', () => {
    it('matches when all expected fields equal the event fields', () => {
      const object = parseHotkey('ctrl+s');
      const event = { which: 'S'.charCodeAt(0), ctrlKey: true, altKey: false, metaKey: false, shiftKey: false };

      expect(compareHotkey(object, event)).toBe(true);
    });

    it('does not match when a modifier differs', () => {
      const object = parseHotkey('ctrl+s');
      const event = { which: 'S'.charCodeAt(0), ctrlKey: false, altKey: false, metaKey: false, shiftKey: false };

      expect(compareHotkey(object, event)).toBe(false);
    });

    it('does not match when the key code differs', () => {
      const object = parseHotkey('ctrl+s');
      const event = { which: 'D'.charCodeAt(0), ctrlKey: true, altKey: false, metaKey: false, shiftKey: false };

      expect(compareHotkey(object, event)).toBe(false);
    });

    it('treats a missing event field as false for boolean modifiers', () => {
      const object = parseHotkey('a');
      const event = { which: 'A'.charCodeAt(0) };

      expect(compareHotkey(object, event)).toBe(true);
    });

    it('skips comparison for optional (null) modifiers', () => {
      const object = parseHotkey('shift?+a');
      const withShift = { which: 'A'.charCodeAt(0), shiftKey: true };
      const withoutShift = { which: 'A'.charCodeAt(0), shiftKey: false };

      expect(compareHotkey(object, withShift)).toBe(true);
      expect(compareHotkey(object, withoutShift)).toBe(true);
    });

    it('treats meta `which` 93 as equivalent to 91', () => {
      const object = parseHotkey('meta');
      expect(object.which).toEqual(91);

      const event = { which: 93, altKey: false, ctrlKey: false, metaKey: true, shiftKey: false };

      expect(compareHotkey(object, event)).toBe(true);
    });

    it('matches by lowercased `key` field when object was parsed byKey', () => {
      const object = parseHotkey('ctrl+S', { byKey: true });
      const event = { key: 'S', ctrlKey: true, altKey: false, metaKey: false, shiftKey: false };

      expect(compareHotkey(object, event)).toBe(true);
    });
  });

  describe('isHotkey / isCodeHotkey / isKeyHotkey', () => {
    it('matches a code-based hotkey against a mock KeyboardEvent', () => {
      const event = {
        which: 'S'.charCodeAt(0),
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
      };

      expect(isHotkey('ctrl+s', event)).toBe(true);
      expect(isCodeHotkey('ctrl+s', event)).toBe(true);
    });

    it('rejects a non-matching code-based hotkey', () => {
      const event = {
        which: 'D'.charCodeAt(0),
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
      };

      expect(isHotkey('ctrl+s', event)).toBe(false);
    });

    it('matches a key-based hotkey against a mock KeyboardEvent', () => {
      const event = {
        key: 'S',
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
      };

      expect(isKeyHotkey('ctrl+s', event)).toBe(true);
    });

    it('rejects a key-based hotkey when the key differs', () => {
      const event = {
        key: 'D',
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
      };

      expect(isKeyHotkey('ctrl+s', event)).toBe(false);
    });

    it('matches any hotkey in an array of alternatives', () => {
      const event = {
        which: 'S'.charCodeAt(0),
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
      };

      expect(isHotkey(['ctrl+d', 'ctrl+s'], event)).toBe(true);
    });

    it('returns a checker function when no event is provided', () => {
      const checker = isHotkey('ctrl+s');

      expect(typeof checker).toEqual('function');
      expect(
        (checker as (e: unknown) => boolean)({
          which: 'S'.charCodeAt(0),
          ctrlKey: true,
          altKey: false,
          metaKey: false,
          shiftKey: false,
        }),
      ).toBe(true);
    });

    it('exports isHotkey as both the default and a named export', () => {
      expect(isHotkeyNamed).toBe(isHotkey);
    });
  });
});
