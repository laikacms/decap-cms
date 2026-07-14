vi.mock('uuid');
vi.mock('../entries');
vi.mock('../integrations');

import { describe, expect, it, vi } from 'vitest';

import { mediaDeleted } from '@/core/actions/mediaLibrary';
import mediaLibrary, {
  selectMediaFiles,
  selectMediaFileByPath,
  selectMediaDisplayURL,
} from '@/core/reducers/mediaLibrary';
import { selectEditingDraft, selectMediaFolder } from '@/core/reducers/entries';
import { selectIntegration } from '@/core/reducers/integrations';

describe('mediaLibrary', () => {
  it('should remove media file by key', () => {
    expect(
      mediaLibrary(
        {
          files: [{ key: 'key1' }, { key: 'key2' }],
          displayURLs: {},
        },
        mediaDeleted({ key: 'key1' }),
      ),
    ).toEqual({
      isDeleting: false,
      files: [{ key: 'key2' }],
      displayURLs: {},
    });
  });

  it('should remove media file by id', () => {
    expect(
      mediaLibrary(
        {
          files: [{ id: 'id1' }, { id: 'id2' }],
          displayURLs: {},
        },
        mediaDeleted({ id: 'id1' }),
      ),
    ).toEqual({
      isDeleting: false,
      files: [{ id: 'id2' }],
      displayURLs: {},
    });
  });

  it('should select draft media files from field when editing a draft', () => {
    vi.mocked(selectEditingDraft).mockReturnValue(true);
    vi.mocked(selectMediaFolder).mockReturnValue('/static/images/posts/logos');

    const imageField = { name: 'image' };
    const collection = { fields: [imageField] };
    const entry = {
      collection: 'posts',
      mediaFiles: [
        { id: 1, path: '/static/images/posts/logos/logo.png' },
        { id: 2, path: '/static/images/posts/general/image.png' },
        { id: 3, path: '/static/images/posts/index.png' },
      ],
      data: {},
    };
    const state = {
      config: {},
      collections: { posts: collection },
      entryDraft: {
        entry,
      },
      integrations: { hooks: {} },
    };

    expect(selectMediaFiles(state, imageField)).toEqual([
      { id: 1, key: 1, path: '/static/images/posts/logos/logo.png' },
    ]);

    expect(selectMediaFolder).toHaveBeenCalledWith(state.config, collection, entry, imageField);
  });

  it('should select draft media files from collection when editing a draft', () => {
    vi.mocked(selectEditingDraft).mockReturnValue(true);
    vi.mocked(selectMediaFolder).mockReturnValue('/static/images/posts');

    const imageField = { name: 'image' };
    const collection = { fields: [imageField] };
    const entry = {
      collection: 'posts',
      mediaFiles: [
        { id: 1, path: '/static/images/posts/logos/logo.png' },
        { id: 2, path: '/static/images/posts/general/image.png' },
        { id: 3, path: '/static/images/posts/index.png' },
      ],
      data: {},
    };
    const state = {
      config: {},
      collections: { posts: collection },
      entryDraft: {
        entry,
      },
      integrations: { hooks: {} },
    };

    expect(selectMediaFiles(state, imageField)).toEqual([
      { id: 3, key: 3, path: '/static/images/posts/index.png' },
    ]);

    expect(selectMediaFolder).toHaveBeenCalledWith(state.config, collection, entry, imageField);
  });

  it('should select global media files when not editing a draft', () => {
    vi.mocked(selectEditingDraft).mockReturnValue(false);

    const state = {
      mediaLibrary: { files: [{ id: 1 }] },
      integrations: { hooks: {} },
    };

    expect(selectMediaFiles(state)).toEqual([{ id: 1 }]);
  });

  it('should select global media files when not using asset store integration', () => {
    vi.mocked(selectIntegration).mockReturnValue({});

    const state = {
      mediaLibrary: { files: [{ id: 1 }] },
      integrations: { hooks: {} },
    };

    expect(selectMediaFiles(state)).toEqual([{ id: 1 }]);
  });

  it('should return media file by path', () => {
    vi.mocked(selectEditingDraft).mockReturnValue(false);

    const state = {
      mediaLibrary: { files: [{ id: 1, path: 'path' }] },
      integrations: { hooks: {} },
    };

    expect(selectMediaFileByPath(state, 'path')).toEqual({ id: 1, path: 'path' });
  });

  it('should return media display URL state', () => {
    const state = {
      mediaLibrary: { displayURLs: { id: { url: 'url' } } },
    };

    expect(selectMediaDisplayURL(state, 'id')).toEqual({ url: 'url' });
  });
});
