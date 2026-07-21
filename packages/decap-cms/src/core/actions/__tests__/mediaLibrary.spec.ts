import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteMedia,
  insertMedia,
  loadMedia,
  MEDIA_LIBRARY_PAGE_SIZE,
  persistMedia,
} from '@/core/actions/mediaLibrary';
import * as backendModule from '@/core/backend';
import * as libUtil from '@/lib/util/index';

vi.mock('../../backend');
vi.mock('../waitUntil');
vi.mock('../../../lib/util/index', async () => {
  const lib = await vi.importActual('../../../lib/util/index');
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

  describe('loadMedia pagination', () => {
    function createPaginatedBackend({
      capabilities = { pagination: true, dynamicSearch: true },
      page = { files: [{ id: 'file1', path: 'file1.png' }], nextCursor: 'N1' },
    } = {}) {
      return {
        supportsMediaPagination: vi.fn(() => true),
        getMediaCapabilities: vi.fn().mockResolvedValue(capabilities),
        getMediaPage: vi.fn().mockResolvedValue(page),
        getMedia: vi.fn().mockResolvedValue([]),
      };
    }

    function createStore(mediaLibraryState = {}) {
      return mockStore({
        config: {},
        collections: {},
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: { files: [], ...mediaLibraryState },
        entryDraft: { entry: {} },
      });
    }

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should load page 1 without a cursor and store the next cursor', async () => {
      const paginatedBackend = createPaginatedBackend();
      currentBackend.mockReturnValue(paginatedBackend);
      const store = createStore();

      await store.dispatch(loadMedia());

      expect(paginatedBackend.getMediaPage).toHaveBeenCalledTimes(1);
      expect(paginatedBackend.getMediaPage).toHaveBeenCalledWith({
        cursor: undefined,
        perPage: MEDIA_LIBRARY_PAGE_SIZE,
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual({ type: 'MEDIA_LOAD_REQUEST', payload: { page: 1 } });
      expect(actions[1].type).toEqual('MEDIA_LOAD_SUCCESS');
      expect(actions[1].payload).toEqual(
        expect.objectContaining({
          files: [{ id: 'file1', path: 'file1.png' }],
          page: 1,
          canPaginate: true,
          hasNextPage: true,
          cursor: 'N1',
          dynamicSearch: true,
        }),
      );
    });

    it('should pass the stored cursor when loading page 2', async () => {
      const paginatedBackend = createPaginatedBackend({
        page: { files: [{ id: 'file2', path: 'file2.png' }], nextCursor: undefined },
      });
      currentBackend.mockReturnValue(paginatedBackend);
      const store = createStore({ cursor: 'N1' });

      await store.dispatch(loadMedia({ page: 2 }));

      expect(paginatedBackend.getMediaPage).toHaveBeenCalledWith({
        cursor: 'N1',
        perPage: MEDIA_LIBRARY_PAGE_SIZE,
      });

      const actions = store.getActions();
      expect(actions[1].type).toEqual('MEDIA_LOAD_SUCCESS');
      expect(actions[1].payload).toEqual(
        expect.objectContaining({ page: 2, hasNextPage: false }),
      );
    });

    it('should not call getMediaPage on page 2 without a stored cursor', async () => {
      const paginatedBackend = createPaginatedBackend();
      currentBackend.mockReturnValue(paginatedBackend);
      const store = createStore();

      await store.dispatch(loadMedia({ page: 2 }));

      expect(paginatedBackend.getMediaPage).not.toHaveBeenCalled();

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual({ type: 'MEDIA_LOAD_REQUEST', payload: { page: 2 } });
      expect(actions[1].type).toEqual('MEDIA_LOAD_SUCCESS');
      expect(actions[1].payload).toEqual(
        expect.objectContaining({ files: [], page: 2, canPaginate: true, hasNextPage: false }),
      );
    });

    it('should fall through to the legacy full load when pagination is not supported', async () => {
      const paginatedBackend = createPaginatedBackend({
        capabilities: { pagination: false, dynamicSearch: false },
      });
      currentBackend.mockReturnValue(paginatedBackend);
      const store = createStore();

      await store.dispatch(loadMedia());

      expect(paginatedBackend.getMediaPage).not.toHaveBeenCalled();
      expect(paginatedBackend.getMedia).toHaveBeenCalledTimes(1);

      const actions = store.getActions();
      expect(actions[0]).toEqual({ type: 'MEDIA_LOAD_REQUEST', payload: { page: 1 } });
      expect(actions[1].type).toEqual('MEDIA_LOAD_SUCCESS');
    });

    it('should dispatch MEDIA_LOAD_FAILURE when getMediaPage rejects', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const paginatedBackend = createPaginatedBackend();
      paginatedBackend.getMediaPage.mockRejectedValue(new Error('boom'));
      currentBackend.mockReturnValue(paginatedBackend);
      const store = createStore();

      await store.dispatch(loadMedia());

      const actions = store.getActions();
      expect(actions[0]).toEqual({ type: 'MEDIA_LOAD_REQUEST', payload: { page: 1 } });
      expect(actions[2]).toEqual({ type: 'MEDIA_LOAD_FAILURE', payload: { privateUpload: undefined } });

      consoleError.mockRestore();
    });

    // DCMS-1063: a failed media listing must surface to the user (toast),
    // not just land in devtools via console.error.
    it('should surface a notification toast when getMediaPage rejects', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const paginatedBackend = createPaginatedBackend();
      paginatedBackend.getMediaPage.mockRejectedValue(new Error('boom'));
      currentBackend.mockReturnValue(paginatedBackend);
      const store = createStore();

      await store.dispatch(loadMedia());

      const actions = store.getActions();
      expect(actions[1]).toEqual(
        expect.objectContaining({
          type: 'NOTIFICATION_SEND',
          payload: expect.objectContaining({ type: 'error' }),
        }),
      );

      consoleError.mockRestore();
    });

    it('should forward the query to a dynamicSearch backend', async () => {
      const paginatedBackend = createPaginatedBackend();
      currentBackend.mockReturnValue(paginatedBackend);
      const store = createStore();

      await store.dispatch(loadMedia({ query: 'logo' }));

      expect(paginatedBackend.getMediaPage).toHaveBeenCalledWith({
        cursor: undefined,
        perPage: MEDIA_LIBRARY_PAGE_SIZE,
        query: 'logo',
      });

      const actions = store.getActions();
      expect(actions[1].type).toEqual('MEDIA_LOAD_SUCCESS');
      expect(actions[1].payload).toEqual(
        expect.objectContaining({ dynamicSearch: true, dynamicSearchQuery: 'logo' }),
      );
    });
  });

  // DCMS-1063: legacy (non-paginated) backends fall through to the plain
  // `backend.getMedia()` load; a non-404 failure there must also surface a
  // notification toast, not just a console.error.
  describe('loadMedia legacy (non-paginated) failure', () => {
    function createLegacyBackend() {
      return {
        supportsMediaPagination: vi.fn(() => false),
        getMedia: vi.fn(),
      };
    }

    function createStore() {
      return mockStore({
        config: {},
        collections: {},
        integrations: { providers: {}, hooks: {} },
        mediaLibrary: { files: [] },
        entryDraft: { entry: {} },
      });
    }

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should surface a notification toast and dispatch MEDIA_LOAD_FAILURE on a non-404 error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const backend = createLegacyBackend();
      backend.getMedia.mockRejectedValue({ status: 500, message: 'boom' });
      currentBackend.mockReturnValue(backend);
      const store = createStore();

      await store.dispatch(loadMedia());

      const actions = store.getActions();
      expect(actions[0]).toEqual({ type: 'MEDIA_LOAD_REQUEST', payload: { page: 1 } });
      expect(actions[1]).toEqual(
        expect.objectContaining({
          type: 'NOTIFICATION_SEND',
          payload: expect.objectContaining({ type: 'error' }),
        }),
      );
      expect(actions[2]).toEqual({ type: 'MEDIA_LOAD_FAILURE', payload: { privateUpload: undefined } });

      consoleError.mockRestore();
    });

    it('should not surface a notification on an expected 404', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const backend = createLegacyBackend();
      backend.getMedia.mockRejectedValue({ status: 404 });
      currentBackend.mockReturnValue(backend);
      const store = createStore();

      await store.dispatch(loadMedia());

      const actions = store.getActions();
      expect(actions.some(a => a.type === 'NOTIFICATION_SEND')).toBe(false);
      expect(actions[1]).toEqual({ type: 'MEDIA_LOAD_SUCCESS', payload: { files: [] } });

      consoleError.mockRestore();
    });
  });
});
