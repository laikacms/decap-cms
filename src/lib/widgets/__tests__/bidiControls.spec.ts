import { describe, expect, it } from 'vitest';

import {
  containsBidiControls,
  splitOnBidiControls,
  visualizeBidiControls,
  stripBidiControls,
  RLO,
  LRO,
} from '@/lib/widgets/bidiControls';

// "admin<RLO>txt.exe" built the same way the widget input would receive it
// from a paste of the DCMS-415 / DCMS-429 repro string.
const TROJAN_TITLE = `admin${RLO}txt.exe`;

describe('containsBidiControls', () => {
  it('returns false for plain strings', () => {
    expect(containsBidiControls('admin.txt.exe')).toBe(false);
  });

  it('returns false for non-string / empty values', () => {
    expect(containsBidiControls(undefined)).toBe(false);
    expect(containsBidiControls(null)).toBe(false);
    expect(containsBidiControls('')).toBe(false);
    expect(containsBidiControls(42)).toBe(false);
  });

  it('returns true when the value contains U+202E (RLO)', () => {
    expect(containsBidiControls(TROJAN_TITLE)).toBe(true);
  });

  it('returns true for each bidi control in the U+202A-U+202E, U+2066-U+2069, U+061C ranges', () => {
    const controls = ['؜', '‪', '‫', '‬', '‭', '‮', '⁦', '⁧', '⁨', '⁩'];
    controls.forEach(ch => {
      expect(containsBidiControls(`a${ch}b`)).toBe(true);
    });
  });
});

describe('splitOnBidiControls', () => {
  it('returns a single plain-text segment when there are no bidi controls', () => {
    expect(splitOnBidiControls('admin.txt.exe')).toEqual([{ text: 'admin.txt.exe' }]);
  });

  it('isolates the bidi control into its own named segment', () => {
    expect(splitOnBidiControls(TROJAN_TITLE)).toEqual([
      { text: 'admin' },
      { text: RLO, control: 'RLO' },
      { text: 'txt.exe' },
    ]);
  });

  it('handles a value that starts or ends with a control, and consecutive controls', () => {
    expect(splitOnBidiControls(`${LRO}${RLO}mid`)).toEqual([
      { text: LRO, control: 'LRO' },
      { text: RLO, control: 'RLO' },
      { text: 'mid' },
    ]);
  });
});

describe('visualizeBidiControls', () => {
  it('replaces the RLO with its named form, matching the DCMS-415 example', () => {
    expect(visualizeBidiControls(TROJAN_TITLE)).toBe('admin<RLO>txt.exe');
  });

  it('leaves plain strings untouched', () => {
    expect(visualizeBidiControls('admin.txt.exe')).toBe('admin.txt.exe');
  });
});

describe('stripBidiControls', () => {
  it('removes the control character entirely, matching the DCMS-415 example', () => {
    expect(stripBidiControls(TROJAN_TITLE)).toBe('admintxt.exe');
  });

  it('leaves plain strings untouched', () => {
    expect(stripBidiControls('admin.txt.exe')).toBe('admin.txt.exe');
  });
});
