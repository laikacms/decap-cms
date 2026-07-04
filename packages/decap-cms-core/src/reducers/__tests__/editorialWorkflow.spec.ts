import reducer from '../editorialWorkflow';
import { CONFIG_SUCCESS } from '../../actions/config';
import {
  UNPUBLISHED_ENTRY_REQUEST,
  UNPUBLISHED_ENTRY_REDIRECT,
  UNPUBLISHED_ENTRY_SUCCESS,
  UNPUBLISHED_ENTRIES_REQUEST,
  UNPUBLISHED_ENTRIES_SUCCESS,
  UNPUBLISHED_ENTRY_PERSIST_REQUEST,
  UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
  UNPUBLISHED_ENTRY_PERSIST_FAILURE,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE,
  UNPUBLISHED_ENTRY_PUBLISH_REQUEST,
  UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
  UNPUBLISHED_ENTRY_PUBLISH_FAILURE,
  UNPUBLISHED_ENTRY_DELETE_SUCCESS,
} from '../../actions/editorialWorkflow';

import type { EditorialWorkflowAction } from '../../types/redux';

function action(type: string, payload?: object): EditorialWorkflowAction {
  return { type, payload } as EditorialWorkflowAction;
}

describe('editorialWorkflow reducer', () => {
  describe('default state', () => {
    it('returns an empty entities/pages state when state is undefined', () => {
      const result = reducer(undefined, action('@@INIT'));
      expect(result).toEqual({ entities: {}, pages: {} });
    });
  });

  describe('CONFIG_SUCCESS', () => {
    it('initialises to { entities: {}, pages: {} } when publish_mode is editorial_workflow', () => {
      const result = reducer(
        { entities: {}, pages: {} },
        action(CONFIG_SUCCESS, { publish_mode: 'editorial_workflow' }),
      );
      expect(result).toEqual({ entities: {}, pages: {} });
    });

    it('leaves state unchanged when publish_mode is not editorial_workflow', () => {
      const initial = { entities: {}, pages: { isFetching: false } };
      const result = reducer(initial, action(CONFIG_SUCCESS, { publish_mode: 'simple' }));
      expect(result).toBe(initial);
    });
  });

  describe('UNPUBLISHED_ENTRY_REQUEST', () => {
    it('sets isFetching=true for the given collection.slug entity', () => {
      const initial = { entities: {}, pages: {} };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_REQUEST, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post'].isFetching).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRY_REDIRECT', () => {
    it('removes the entity key for the given collection.slug', () => {
      const initial = {
        entities: { 'posts.my-post': { slug: 'my-post', isFetching: true } },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_REDIRECT, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post']).toBeUndefined();
    });
  });

  describe('UNPUBLISHED_ENTRY_SUCCESS', () => {
    it('stores the entry under collection.slug in entities', () => {
      const initial = { entities: {}, pages: {} };
      const entry = { slug: 'my-post', title: 'Hello', status: 'draft' };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_SUCCESS, { collection: 'posts', entry }),
      );
      expect(result.entities['posts.my-post'].slug).toBe('my-post');
      expect(result.entities['posts.my-post'].title).toBe('Hello');
    });
  });

  describe('UNPUBLISHED_ENTRIES_REQUEST', () => {
    it('sets pages.isFetching to true', () => {
      const initial = { entities: {}, pages: {} };
      const result = reducer(initial, action(UNPUBLISHED_ENTRIES_REQUEST));
      expect(result.pages.isFetching).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRIES_SUCCESS', () => {
    it('populates entities and sets pages from payload', () => {
      const initial = { entities: {}, pages: { isFetching: true } };
      const entries = [
        { collection: 'posts', slug: 'post-1', title: 'Post 1' },
        { collection: 'posts', slug: 'post-2', title: 'Post 2' },
      ];
      const pages = { currentPage: 1, totalPages: 1 };
      const result = reducer(initial, action(UNPUBLISHED_ENTRIES_SUCCESS, { entries, pages }));
      expect(result.entities['posts.post-1'].slug).toBe('post-1');
      expect(result.entities['posts.post-2'].slug).toBe('post-2');
      expect(result.entities['posts.post-1'].isFetching).toBe(false);
      expect(result.pages.ids).toEqual(['post-1', 'post-2']);
      expect(result.pages.currentPage).toBe(1);
    });
  });

  describe('UNPUBLISHED_ENTRY_PERSIST_REQUEST', () => {
    it('sets isPersisting=true for the given collection.slug', () => {
      const initial = { entities: {}, pages: {} };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PERSIST_REQUEST, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post'].isPersisting).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRY_PERSIST_SUCCESS', () => {
    it('stores the persisted entry and removes isPersisting flag', () => {
      const initial = {
        entities: {
          'posts.my-post': { slug: 'my-post', isPersisting: true },
        },
        pages: { ids: ['my-post'] },
      };
      const entry = { slug: 'my-post', title: 'Updated' };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PERSIST_SUCCESS, { collection: 'posts', entry }),
      );
      expect(result.entities['posts.my-post'].title).toBe('Updated');
      expect(result.entities['posts.my-post'].isPersisting).toBeUndefined();
    });

    it('appends the slug to pages.ids', () => {
      const initial = {
        entities: {},
        pages: { ids: [] },
      };
      const entry = { slug: 'new-post' };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PERSIST_SUCCESS, { collection: 'posts', entry }),
      );
      expect(result.pages.ids).toEqual(['new-post']);
    });
  });

  describe('UNPUBLISHED_ENTRY_PERSIST_FAILURE', () => {
    it('sets isPersisting=false for the given collection.slug', () => {
      const initial = {
        entities: { 'posts.my-post': { slug: 'my-post', isPersisting: true } },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PERSIST_FAILURE, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post'].isPersisting).toBe(false);
    });
  });

  describe('UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST', () => {
    it('sets isUpdatingStatus=true for the given collection.slug', () => {
      const initial = {
        entities: { 'posts.my-post': { slug: 'my-post' } },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post'].isUpdatingStatus).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS', () => {
    it('updates status and clears isUpdatingStatus', () => {
      const initial = {
        entities: {
          'posts.my-post': { slug: 'my-post', status: 'draft', isUpdatingStatus: true },
        },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS, {
          collection: 'posts',
          slug: 'my-post',
          newStatus: 'pending_review',
        }),
      );
      expect(result.entities['posts.my-post'].status).toBe('pending_review');
      expect(result.entities['posts.my-post'].isUpdatingStatus).toBe(false);
    });
  });

  describe('UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE', () => {
    it('sets isUpdatingStatus=false for the given collection.slug', () => {
      const initial = {
        entities: {
          'posts.my-post': { slug: 'my-post', isUpdatingStatus: true },
        },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post'].isUpdatingStatus).toBe(false);
    });
  });

  describe('UNPUBLISHED_ENTRY_PUBLISH_REQUEST', () => {
    it('sets isPublishing=true for the given collection.slug', () => {
      const initial = {
        entities: { 'posts.my-post': { slug: 'my-post' } },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PUBLISH_REQUEST, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post'].isPublishing).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRY_PUBLISH_SUCCESS', () => {
    it('removes the entity key for the published entry', () => {
      const initial = {
        entities: {
          'posts.my-post': { slug: 'my-post', isPublishing: true },
        },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PUBLISH_SUCCESS, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post']).toBeUndefined();
    });
  });

  describe('UNPUBLISHED_ENTRY_PUBLISH_FAILURE', () => {
    it('returns state unchanged', () => {
      const initial = {
        entities: {
          'posts.my-post': { slug: 'my-post', isPublishing: true },
        },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PUBLISH_FAILURE, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result).toBe(initial);
    });
  });

  describe('UNPUBLISHED_ENTRY_DELETE_SUCCESS', () => {
    it('removes the entity key for the deleted entry', () => {
      const initial = {
        entities: {
          'posts.my-post': { slug: 'my-post' },
          'posts.other-post': { slug: 'other-post' },
        },
        pages: {},
      };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_DELETE_SUCCESS, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.entities['posts.my-post']).toBeUndefined();
      expect(result.entities['posts.other-post']).toBeDefined();
    });
  });
});
