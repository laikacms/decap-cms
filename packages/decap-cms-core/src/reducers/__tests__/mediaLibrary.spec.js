import { mediaDeleted } from '../../actions/mediaLibrary';
import mediaLibrary, {
  selectMediaFiles,
  selectMediaFileByPath,
  selectMediaDisplayURL,
} from '../mediaLibrary';

jest.mock('uuid');
jest.mock('../entries');
jest.mock('../');

describe('mediaLibrary', () => {
  it('should remove media file by key', () => {
    expect(
      mediaLibrary(
        {
          files: [{ key: 'key1' }, { key: 'key2' }],
        },
        mediaDeleted({ key: 'key1' }),
      ),
    ).toEqual({
      isDeleting: false,
      displayURLs: {},
      files: [{ key: 'key2' }],
    });
  });

  it('should remove media file by id', () => {
    expect(
      mediaLibrary(
        {
          files: [{ id: 'id1' }, { id: 'id2' }],
        },
        mediaDeleted({ id: 'id1' }),
      ),
    ).toEqual({
      isDeleting: false,
      displayURLs: {},
      files: [{ id: 'id2' }],
    });
  });

  it('should select draft media files from field when editing a draft', () => {
    const { selectEditingDraft, selectMediaFolder } = require('../../reducers/entries');

    selectEditingDraft.mockReturnValue(true);
    selectMediaFolder.mockReturnValue('/static/images/posts/logos');

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
    };

    expect(selectMediaFiles(state, imageField)).toEqual([
      { id: 1, key: 1, path: '/static/images/posts/logos/logo.png' },
    ]);

    expect(selectMediaFolder).toHaveBeenCalledWith(state.config, collection, entry, imageField);
  });

  it('should select draft media files from collection when editing a draft', () => {
    const { selectEditingDraft, selectMediaFolder } = require('../../reducers/entries');

    selectEditingDraft.mockReturnValue(true);
    selectMediaFolder.mockReturnValue('/static/images/posts');

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
    };

    expect(selectMediaFiles(state, imageField)).toEqual([
      { id: 3, key: 3, path: '/static/images/posts/index.png' },
    ]);

    expect(selectMediaFolder).toHaveBeenCalledWith(state.config, collection, entry, imageField);
  });

  it('should select global media files when not editing a draft', () => {
    const { selectEditingDraft } = require('../../reducers/entries');

    selectEditingDraft.mockReturnValue(false);

    const state = {
      mediaLibrary: { files: [{ id: 1 }] },
    };

    expect(selectMediaFiles(state)).toEqual([{ id: 1 }]);
  });

  it('should select global media files when not using asset store integration', () => {
    const { selectIntegration } = require('../../reducers');

    selectIntegration.mockReturnValue({});

    const state = {
      mediaLibrary: { files: [{ id: 1 }] },
    };

    expect(selectMediaFiles(state)).toEqual([{ id: 1 }]);
  });

  it('should return media file by path', () => {
    const { selectEditingDraft } = require('../../reducers/entries');

    selectEditingDraft.mockReturnValue(false);

    const state = {
      mediaLibrary: { files: [{ id: 1, path: 'path' }] },
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
