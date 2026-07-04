import { beforeEach, describe, expect, it, vi } from 'vitest';
import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';

import * as libUtil from '../../../lib-util/index';
import { insertMedia, persistMedia, deleteMedia } from '../mediaLibrary';
import * as backendModule from '../../backend';

vi.mock('../../backend');
vi.mock('../waitUntil');
vi.mock('../../../lib-util/index', async () => {
  const lib = await vi.importActual('../../../lib-util/index');
  return {
    ...lib,
    getBlobSHA: vi.fn(),
  };
});

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('mediaLibrary', () => {
  describe('insertMedia', () => {
    it('should return mediaPath as string when string is given', () => {
      const store = mockStore({
        config: {
          public_folder: '/media',
        },
        collections: {
          posts: { name: 'posts' },
        },
        entryDraft: {
          entry: { isPersisting: false, collection: 'posts' },
        },
      });

      store.dispatch(insertMedia('foo.png'));
      expect(store.getActions()[0]).toEqual({
        type: 'MEDIA_INSERT',
        payload: { mediaPath: '/media/foo.png' },
      });
    });

    it('should return mediaPath as array of strings when array of strings is given', () => {
      const store = mockStore({
        config: {
          public_folder: '/media',
        },
        collections: {
          posts: { name: 'posts' },
        },
        entryDraft: {
          entry: { isPersisting: false, collection: 'posts' },
        },
      });

      store.dispatch(insertMedia(['foo.png']));
      expect(store.getActions()[0]).toEqual({
        type: 'MEDIA_INSERT',
        payload: { mediaPath: ['/media/foo.png'] },
      });
    });
  });

  const currentBackend = vi.mocked(backendModule.currentBackend);

  const backend = {
    persistMedia: vi.fn(() => ({ id: 'id' })),
    deleteMedia: vi.fn(),
  };

  currentBackend.mockReturnValue(backend);

  describe('persistMedia', () => {
    (global as any).URL = { createObjectURL: vi.fn().mockReturnValue('displayURL') };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should not persist media when editing draft', () => {
      const getBlobSHA = vi.mocked(libUtil.getBlobSHA);

      getBlobSHA.mockReturnValue('000000000000000');

      const store = mockStore({
        config: {
          media_folder: 'static/media',
          slug: {
            encoding: 'unicode',
            clean_accents: false,
            sanitize_replacement: '-',
          },
        },
        collections: {
          posts: { name: 'posts' },
        },
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: {
          files: [],
        },
        entryDraft: {
          entry: { isPersisting: false, collection: 'posts' },
        },
      });

      const file = new File([''], 'name.png');

      return store.dispatch(persistMedia(file)).then(() => {
        const actions = store.getActions();

        expect(actions).toHaveLength(2);
        expect(actions[0].type).toEqual('ADD_ASSET');
        expect(actions[0].payload).toEqual(
          expect.objectContaining({
            path: 'static/media/name.png',
          }),
        );
        expect(actions[1].type).toEqual('ADD_DRAFT_ENTRY_MEDIA_FILE');
        expect(actions[1].payload).toEqual(
          expect.objectContaining({
            draft: true,
            id: '000000000000000',
            path: 'static/media/name.png',
            size: file.size,
            name: file.name,
          }),
        );

        expect(getBlobSHA).toHaveBeenCalledTimes(1);
        expect(getBlobSHA).toHaveBeenCalledWith(file);
        expect(backend.persistMedia).toHaveBeenCalledTimes(0);
      });
    });

    it('should persist media when not editing draft', () => {
      const store = mockStore({
        config: {
          media_folder: 'static/media',
          slug: {
            encoding: 'unicode',
            clean_accents: false,
            sanitize_replacement: '-',
          },
        },
        collections: {
          posts: { name: 'posts' },
        },
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: {
          files: [],
        },
        entryDraft: {
          entry: {},
        },
      });

      const file = new File([''], 'name.png');

      return store.dispatch(persistMedia(file)).then(() => {
        const actions = store.getActions();

        expect(actions).toHaveLength(3);

        expect(actions).toHaveLength(3);
        expect(actions[0]).toEqual({ type: 'MEDIA_PERSIST_REQUEST' });
        expect(actions[1].type).toEqual('ADD_ASSET');
        expect(actions[1].payload).toEqual(
          expect.objectContaining({
            path: 'static/media/name.png',
          }),
        );
        expect(actions[2]).toEqual({
          type: 'MEDIA_PERSIST_SUCCESS',
          payload: {
            file: { id: 'id' },
          },
        });

        expect(backend.persistMedia).toHaveBeenCalledTimes(1);
        expect(backend.persistMedia).toHaveBeenCalledWith(
          store.getState().config,
          expect.objectContaining({
            path: 'static/media/name.png',
          }),
        );
      });
    });

    it('should sanitize media name if needed when persisting', () => {
      const store = mockStore({
        config: {
          media_folder: 'static/media',
          slug: {
            encoding: 'ascii',
            clean_accents: true,
            sanitize_replacement: '_',
          },
        },
        collections: {
          posts: { name: 'posts' },
        },
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: {
          files: [],
        },
        entryDraft: {
          entry: {},
        },
      });

      const file = new File([''], 'abc DEF éâçÖ $;, .png');

      return store.dispatch(persistMedia(file)).then(() => {
        const actions = store.getActions();

        expect(actions).toHaveLength(3);

        expect(actions[0]).toEqual({ type: 'MEDIA_PERSIST_REQUEST' });

        expect(actions[1].type).toEqual('ADD_ASSET');
        expect(actions[1].payload).toEqual(
          expect.objectContaining({
            path: 'static/media/abc_def_eaco_.png',
          }),
        );

        expect(actions[2]).toEqual({
          type: 'MEDIA_PERSIST_SUCCESS',
          payload: {
            file: { id: 'id' },
          },
        });

        expect(backend.persistMedia).toHaveBeenCalledTimes(1);
        expect(backend.persistMedia).toHaveBeenCalledWith(
          store.getState().config,
          expect.objectContaining({
            path: 'static/media/abc_def_eaco_.png',
          }),
        );
      });
    });
  });

  describe('deleteMedia', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should delete non draft file', () => {
      const store = mockStore({
        config: {
          publish_mode: 'editorial_workflow',
        },
        collections: {},
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: {
          files: [],
        },
        entryDraft: {
          entry: { isPersisting: false },
        },
      });

      const file = { name: 'name.png', id: 'id', path: 'static/media/name.png', draft: false };

      return store.dispatch(deleteMedia(file)).then(() => {
        const actions = store.getActions();

        expect(actions).toHaveLength(4);
        expect(actions[0]).toEqual({ type: 'MEDIA_DELETE_REQUEST' });
        expect(actions[1]).toEqual({
          type: 'REMOVE_ASSET',
          payload: 'static/media/name.png',
        });
        expect(actions[2]).toEqual({
          type: 'MEDIA_DELETE_SUCCESS',
          payload: { file },
        });
        expect(actions[3]).toEqual({
          type: 'REMOVE_DRAFT_ENTRY_MEDIA_FILE',
          payload: { id: 'id' },
        });

        expect(backend.deleteMedia).toHaveBeenCalledTimes(1);
        expect(backend.deleteMedia).toHaveBeenCalledWith(
          store.getState().config,
          'static/media/name.png',
        );
      });
    });

    it('should not delete a draft file', () => {
      const store = mockStore({
        config: {
          publish_mode: 'editorial_workflow',
        },
        collections: {},
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: {
          files: [],
        },
        entryDraft: {
          entry: { isPersisting: false },
        },
      });

      const file = { name: 'name.png', id: 'id', path: 'static/media/name.png', draft: true };

      return store.dispatch(deleteMedia(file)).then(() => {
        const actions = store.getActions();

        expect(actions).toHaveLength(2);
        expect(actions[0]).toEqual({
          type: 'REMOVE_ASSET',
          payload: 'static/media/name.png',
        });

        expect(actions[1]).toEqual({
          type: 'REMOVE_DRAFT_ENTRY_MEDIA_FILE',
          payload: { id: 'id' },
        });

        expect(backend.deleteMedia).toHaveBeenCalledTimes(0);
      });
    });
  });
});
