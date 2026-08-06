vi.mock('../registry');

import { describe, expect, it, vi } from 'vitest';

import { getPhrases } from '@/core/lib/phrases';
import { getLocale } from '@/core/lib/registry';

describe('defaultPhrases', () => {
  it('should merge en locale with given locale', () => {
    const locales = {
      en: {
        app: {
          header: {
            content: 'Contents',
            workflow: 'Workflow',
            media: 'Media',
            quickAdd: 'Quick add',
          },
          app: {
            errorHeader: 'Error loading the CMS configuration',
            configErrors: 'Config Errors',
            checkConfigYml: 'Check your config.yml file.',
            loadingConfig: 'Loading configuration...',
            waitingBackend: 'Waiting for backend...',
          },
          notFoundPage: {
            header: 'Not Found',
          },
        },
        collection: {
          sidebar: {
            collections: 'Collections',
            searchAll: 'Search all',
          },
          collectionTop: {
            viewAs: 'View as',
            newButton: 'New %{collectionLabel}',
          },
          entries: {
            loadingEntries: 'Loading Entries',
            cachingEntries: 'Caching Entries',
            longerLoading: 'This might take several minutes',
          },
        },
      },
      de: {
        app: {
          header: {
            content: 'Inhalt',
          },
        },
      },
    };

    vi.mocked(getLocale).mockImplementation(locale => locales[locale]);

    expect(getPhrases('de')).toEqual({
      app: {
        header: {
          content: 'Inhalt',
          workflow: 'Workflow',
          media: 'Media',
          quickAdd: 'Quick add',
        },
        app: {
          errorHeader: 'Error loading the CMS configuration',
          configErrors: 'Config Errors',
          checkConfigYml: 'Check your config.yml file.',
          loadingConfig: 'Loading configuration...',
          waitingBackend: 'Waiting for backend...',
        },
        notFoundPage: {
          header: 'Not Found',
        },
      },
      collection: {
        sidebar: {
          collections: 'Collections',
          searchAll: 'Search all',
        },
        collectionTop: {
          viewAs: 'View as',
          newButton: 'New %{collectionLabel}',
        },
        entries: {
          loadingEntries: 'Loading Entries',
          cachingEntries: 'Caching Entries',
          longerLoading: 'This might take several minutes',
        },
      },
    });
  });

  it('should not mutate default phrases', () => {
    const locales = {
      en: {
        app: {
          header: {
            content: 'Contents',
          },
        },
      },
      de: {
        app: {
          header: {
            content: 'Inhalt',
          },
        },
      },
    };

    vi.mocked(getLocale).mockImplementation(locale => locales[locale]);

    const result = getPhrases('de');

    expect(result === locales['en']).toBe(false);
  });

  it('should warn when no locale is loaded at all', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(getLocale).mockReturnValue(undefined);

    expect(getPhrases('de')).toEqual({});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No locale loaded'));

    warn.mockRestore();
  });

  it('should not warn when the en fallback is loaded', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const locales = {
      en: {
        app: {
          header: {
            content: 'Contents',
          },
        },
      },
    };
    vi.mocked(getLocale).mockImplementation(locale => locales[locale]);

    getPhrases('de');
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });
});
