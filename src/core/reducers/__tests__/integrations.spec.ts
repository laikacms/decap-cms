import { describe, expect, it } from 'vitest';

import integrations from '@/core/reducers/integrations';
import { CONFIG_SUCCESS } from '@/core/actions/config';
import { FOLDER } from '@/core/constants/collectionTypes';

import type { ConfigAction } from '@/core/actions/config';

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
