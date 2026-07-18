vi.mock('../entries');
vi.mock('../integrations');

import { describe, expect, it, vi } from 'vitest';

import { mediaDeleted, mediaLoaded } from '@/core/actions/mediaLibrary';
import { selectEditingDraft, selectMediaFolder } from '@/core/reducers/entries';
import { selectIntegration } from '@/core/reducers/integrations';
import mediaLibrary, {
  selectMediaDisplayURL,
  selectMediaFileByPath,
  selectMediaFiles,
} from '@/core/reducers/mediaLibrary';

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

  describe('cursor pagination on MEDIA_LOAD_SUCCESS', () => {
    it('should store explicit hasNextPage and cursor from a paginated backend', () => {
      const result = mediaLibrary(
        { files: [], displayURLs: {} },
        mediaLoaded([{ id: 'a' }], { page: 1, canPaginate: true, hasNextPage: true, cursor: 'C1' }),
      );

      expect(result.hasNextPage).toBe(true);
      expect(result.cursor).toBe('C1');
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual(expect.objectContaining({ id: 'a' }));
    });

    it('should concat files on page 2 and clear cursor when exhausted', () => {
      const result = mediaLibrary(
        { files: [{ key: 'k1', id: 'a' }], displayURLs: {} },
        mediaLoaded([{ id: 'b' }], { page: 2, canPaginate: true, hasNextPage: false }),
      );

      expect(result.files).toHaveLength(2);
      expect(result.files[0]).toEqual(expect.objectContaining({ id: 'a' }));
      expect(result.files[1]).toEqual(expect.objectContaining({ id: 'b' }));
      expect(result.hasNextPage).toBe(false);
      expect(result.cursor).toBeUndefined();
    });

    it('should keep the legacy length heuristic when hasNextPage is absent', () => {
      const withFiles = mediaLibrary(
        { files: [], displayURLs: {} },
        mediaLoaded([{ id: 'a' }, { id: 'b' }], { page: 1, canPaginate: true }),
      );
      expect(withFiles.hasNextPage).toBe(true);

      const withoutFiles = mediaLibrary(
        { files: [], displayURLs: {} },
        mediaLoaded([], { page: 1, canPaginate: true }),
      );
      expect(withoutFiles.hasNextPage).toBe(false);
    });
  });
});
