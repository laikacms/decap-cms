import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLanguageExtension } from '@/widgets/code/languageLoaders';

import type { LanguageSupport } from '@codemirror/language';
import type { Extension } from '@codemirror/state';

const loaders = vi.hoisted(() => ({
  js: vi.fn(),
  c: vi.fn(),
  h: vi.fn(),
}));

vi.mock('@codemirror/language-data', async () => {
  const { LanguageDescription } = await import('@codemirror/language');
  return {
    languages: [
      LanguageDescription.of({ name: 'JavaScript', alias: ['js'], load: loaders.js }),
      LanguageDescription.of({ name: 'C', load: loaders.c }),
      LanguageDescription.of({ name: 'H', load: loaders.h }),
    ],
  };
});

describe('getLanguageExtension', () => {
  beforeEach(() => {
    loaders.js.mockReset();
    loaders.c.mockReset();
    loaders.h.mockReset();
  });

  it('resolves the extension for a known single identifier', async () => {
    const jsExtension = [] as Extension as LanguageSupport;
    loaders.js.mockResolvedValue(jsExtension);

    await expect(getLanguageExtension(['javascript'])).resolves.toBe(jsExtension);
    expect(loaders.js).toHaveBeenCalled();
  });

  it('resolves via the first matching identifier when several match, e.g. C\'s ["c", "h"]', async () => {
    const cExtension = [] as Extension as LanguageSupport;
    const hExtension = [] as Extension as LanguageSupport;
    loaders.c.mockResolvedValue(cExtension);
    loaders.h.mockResolvedValue(hExtension);

    await expect(getLanguageExtension(['c', 'h'])).resolves.toBe(cExtension);
    expect(loaders.c).toHaveBeenCalled();
    expect(loaders.h).not.toHaveBeenCalled();
  });

  it('returns null when no identifier maps to a language', async () => {
    await expect(
      getLanguageExtension(['not-a-real-language', 'also-not-real']),
    ).resolves.toBeNull();
    expect(loaders.js).not.toHaveBeenCalled();
    expect(loaders.c).not.toHaveBeenCalled();
    expect(loaders.h).not.toHaveBeenCalled();
  });
});
