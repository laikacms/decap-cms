import { describe, expect, it } from 'vitest';

import { remove } from '@/core/lib/diacritics';

describe('diacritics remove', () => {
  it('maps accented Latin characters to their base ASCII equivalent', () => {
    expect(remove('é')).toEqual('e');
    expect(remove('ñ')).toEqual('n');
    expect(remove('ü')).toEqual('u');
    expect(remove('à')).toEqual('a');
    expect(remove('ç')).toEqual('c');
    expect(remove('ö')).toEqual('o');
    expect(remove('É')).toEqual('E');
    expect(remove('Ñ')).toEqual('N');
  });

  it('returns already-ASCII strings unchanged', () => {
    expect(remove('Hello, World! 123')).toEqual('Hello, World! 123');
    expect(remove('the-quick_brown.fox~jumps')).toEqual('the-quick_brown.fox~jumps');
  });

  it('leaves non-Latin characters without a mapping unchanged', () => {
    expect(remove('日本語のタイトル')).toEqual('日本語のタイトル');
    expect(remove('🎉')).toEqual('🎉');
  });

  it('returns an empty string unchanged', () => {
    expect(remove('')).toEqual('');
  });

  it('handles mixed accented and plain input', () => {
    expect(remove('café résumé')).toEqual('cafe resume');
    expect(remove('Ångström über München')).toEqual('Angstrom uber Munchen');
    expect(remove('ěščřžý')).toEqual('escrzy');
  });
});
