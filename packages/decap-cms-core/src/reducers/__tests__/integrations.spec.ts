import integrations, { selectIntegration } from '../integrations';
import { CONFIG_SUCCESS } from '../../actions/config';
import { FOLDER } from '../../constants/collectionTypes';

import type { ConfigAction } from '../../actions/config';
import type { Integrations } from '../../types/redux';

describe('integrations', () => {
  it('should return default state when no integrations', () => {
    const result = integrations(null, {
      type: CONFIG_SUCCESS,
      payload: { integrations: [] },
    } as ConfigAction);
    expect(result).toEqual({
      providers: {},
      hooks: {},
    });
  });

  it('should return hooks and providers map when has integrations', () => {
    const result = integrations(null, {
      type: CONFIG_SUCCESS,
      payload: {
        integrations: [
          {
            hooks: ['listEntries'],
            collections: '*',
            provider: 'algolia',
            applicationID: 'applicationID',
            apiKey: 'apiKey',
          },
          {
            hooks: ['listEntries'],
            collections: ['posts'],
            provider: 'algolia',
            applicationID: 'applicationID',
            apiKey: 'apiKey',
          },
          {
            hooks: ['assetStore'],
            provider: 'assetStore',
            getSignedFormURL: 'https://asset.store.com/signedUrl',
          },
        ],
        collections: [
          { name: 'posts', label: 'Posts', type: FOLDER },
          { name: 'pages', label: 'Pages', type: FOLDER },
          { name: 'faq', label: 'FAQ', type: FOLDER },
        ],
      },
    } as ConfigAction);

    expect(result).toEqual({
      providers: {
        algolia: {
          applicationID: 'applicationID',
          apiKey: 'apiKey',
        },
        assetStore: {
          getSignedFormURL: 'https://asset.store.com/signedUrl',
        },
      },
      hooks: {
        posts: {
          listEntries: 'algolia',
        },
        pages: {
          listEntries: 'algolia',
        },
        faq: {
          listEntries: 'algolia',
        },
        assetStore: 'assetStore',
      },
    });
  });
});

describe('selectIntegration', () => {
  function buildState(): Integrations {
    return integrations(null, {
      type: CONFIG_SUCCESS,
      payload: {
        integrations: [
          {
            hooks: ['listEntries', 'search'],
            collections: ['posts'],
            provider: 'algolia',
            applicationID: 'applicationID',
            apiKey: 'apiKey',
          },
          {
            hooks: ['assetStore'],
            provider: 'cloudinary',
            getSignedFormURL: 'https://cloudinary.example.com/sign',
          },
        ],
        collections: [{ name: 'posts', label: 'Posts', type: FOLDER }],
      },
    } as ConfigAction) as Integrations;
  }

  it('returns provider for a collection-scoped hook lookup', () => {
    const state = buildState();
    expect(selectIntegration(state, 'posts', 'listEntries')).toBe('algolia');
  });

  it('returns provider for a global hook lookup (null collection)', () => {
    const state = buildState();
    expect(selectIntegration(state, null, 'assetStore')).toBe('cloudinary');
  });

  it('returns false for a missing collection', () => {
    const state = buildState();
    expect(selectIntegration(state, 'unknown-collection', 'listEntries')).toBe(false);
  });

  it('returns false for a missing hook within an existing collection', () => {
    const state = buildState();
    expect(selectIntegration(state, 'posts', 'nonExistentHook')).toBe(false);
  });

  it('returns false when collection is null and the hook does not exist globally', () => {
    const state = buildState();
    expect(selectIntegration(state, null, 'listEntries')).toBe(false);
  });
});
