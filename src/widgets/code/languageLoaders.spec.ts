import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLanguageExtension } from '@/widgets/code/languageLoaders';

import type { Extension } from '@uiw/react-codemirror';

const loadLanguageMock = vi.fn();

vi.mock('@uiw/codemirror-extensions-langs', () => ({
  loadLanguage: (id: string) => loadLanguageMock(id),
}));

describe('getLanguageExtension', () => {
  beforeEach(() => {
    loadLanguageMock.mockReset();
  });

  it('resolves the extension for a known single identifier', () => {
    const jsExtension = {} as Extension;
    loadLanguageMock.mockImplementation((id: string) => (id === 'javascript' ? jsExtension : null));

    expect(getLanguageExtension(['javascript'])).toBe(jsExtension);
    expect(loadLanguageMock).toHaveBeenCalledWith('javascript');
  });

  it('resolves via the first matching identifier when several match, e.g. C\'s ["c", "h"]', () => {
    const cExtension = {} as Extension;
    const hExtension = {} as Extension;
    loadLanguageMock.mockImplementation((id: string) => {
      if (id === 'c') return cExtension;
      if (id === 'h') return hExtension;
      return null;
    });

    expect(getLanguageExtension(['c', 'h'])).toBe(cExtension);
    expect(loadLanguageMock).toHaveBeenCalledWith('c');
    expect(loadLanguageMock).not.toHaveBeenCalledWith('h');
  });

  it('returns null when no identifier maps to a language', () => {
    loadLanguageMock.mockReturnValue(null);

    expect(getLanguageExtension(['not-a-real-language', 'also-not-real'])).toBeNull();
    expect(loadLanguageMock).toHaveBeenCalledWith('not-a-real-language');
    expect(loadLanguageMock).toHaveBeenCalledWith('also-not-real');
  });
});
