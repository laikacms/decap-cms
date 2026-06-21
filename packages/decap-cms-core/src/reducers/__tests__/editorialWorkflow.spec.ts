import { Map, List, fromJS } from 'immutable';

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
    it('returns an empty Map when state is undefined', () => {
      const result = reducer(undefined, action('@@INIT'));
      expect(Map.isMap(result)).toBe(true);
      expect(result.size).toBe(0);
    });
  });

  describe('CONFIG_SUCCESS', () => {
    it('initialises to { entities: {}, pages: {} } when publish_mode is editorial_workflow', () => {
      const result = reducer(Map(), action(CONFIG_SUCCESS, { publish_mode: 'editorial_workflow' }));
      expect(result.toJS()).toEqual({ entities: {}, pages: {} });
    });

    it('leaves state unchanged when publish_mode is not editorial_workflow', () => {
      const initial = Map({ entities: Map(), pages: Map({ isFetching: false }) });
      const result = reducer(initial, action(CONFIG_SUCCESS, { publish_mode: 'simple' }));
      expect(result).toBe(initial);
    });
  });

  describe('UNPUBLISHED_ENTRY_REQUEST', () => {
    it('sets isFetching=true for the given collection.slug entity', () => {
      const initial = Map({ entities: Map(), pages: Map() });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_REQUEST, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'isFetching'])).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRY_REDIRECT', () => {
    it('removes the entity key for the given collection.slug', () => {
      const initial = Map({
        entities: Map({ 'posts.my-post': fromJS({ slug: 'my-post', isFetching: true }) }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_REDIRECT, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post'])).toBeUndefined();
    });
  });

  describe('UNPUBLISHED_ENTRY_SUCCESS', () => {
    it('stores the entry under collection.slug in entities', () => {
      const initial = Map({ entities: Map(), pages: Map() });
      const entry = { slug: 'my-post', title: 'Hello', status: 'draft' };
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_SUCCESS, { collection: 'posts', entry }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'slug'])).toBe('my-post');
      expect(result.getIn(['entities', 'posts.my-post', 'title'])).toBe('Hello');
    });
  });

  describe('UNPUBLISHED_ENTRIES_REQUEST', () => {
    it('sets pages.isFetching to true', () => {
      const initial = Map({ entities: Map(), pages: Map() });
      const result = reducer(initial, action(UNPUBLISHED_ENTRIES_REQUEST));
      expect(result.getIn(['pages', 'isFetching'])).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRIES_SUCCESS', () => {
    it('populates entities and sets pages from payload', () => {
      const initial = Map({ entities: Map(), pages: Map({ isFetching: true }) });
      const entries = [
        { collection: 'posts', slug: 'post-1', title: 'Post 1' },
        { collection: 'posts', slug: 'post-2', title: 'Post 2' },
      ];
      const pages = { currentPage: 1, totalPages: 1 };
      const result = reducer(initial, action(UNPUBLISHED_ENTRIES_SUCCESS, { entries, pages }));
      expect(result.getIn(['entities', 'posts.post-1', 'slug'])).toBe('post-1');
      expect(result.getIn(['entities', 'posts.post-2', 'slug'])).toBe('post-2');
      expect(result.getIn(['entities', 'posts.post-1', 'isFetching'])).toBe(false);
      expect(result.getIn(['pages', 'ids'])).toEqual(List(['post-1', 'post-2']));
      expect(result.getIn(['pages', 'currentPage'])).toBe(1);
    });
  });

  describe('UNPUBLISHED_ENTRY_PERSIST_REQUEST', () => {
    it('sets isPersisting=true for the given collection.slug', () => {
      const initial = Map({ entities: Map(), pages: Map() });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PERSIST_REQUEST, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'isPersisting'])).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRY_PERSIST_SUCCESS', () => {
    it('stores the persisted entry and removes isPersisting flag', () => {
      const initial = Map({
        entities: Map({
          'posts.my-post': fromJS({ slug: 'my-post', isPersisting: true }),
        }),
        pages: Map({ ids: List(['my-post']) }),
      });
      const entry = fromJS({ slug: 'my-post', title: 'Updated' });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PERSIST_SUCCESS, { collection: 'posts', entry }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'title'])).toBe('Updated');
      expect(result.getIn(['entities', 'posts.my-post', 'isPersisting'])).toBeUndefined();
    });

    it('appends the slug to pages.ids', () => {
      const initial = Map({
        entities: Map(),
        pages: Map({ ids: List() }),
      });
      const entry = fromJS({ slug: 'new-post' });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PERSIST_SUCCESS, { collection: 'posts', entry }),
      );
      expect(result.getIn(['pages', 'ids'])).toEqual(List(['new-post']));
    });
  });

  describe('UNPUBLISHED_ENTRY_PERSIST_FAILURE', () => {
    it('sets isPersisting=false for the given collection.slug', () => {
      const initial = Map({
        entities: Map({ 'posts.my-post': fromJS({ slug: 'my-post', isPersisting: true }) }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PERSIST_FAILURE, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'isPersisting'])).toBe(false);
    });
  });

  describe('UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST', () => {
    it('sets isUpdatingStatus=true for the given collection.slug', () => {
      const initial = Map({
        entities: Map({ 'posts.my-post': fromJS({ slug: 'my-post' }) }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_STATUS_CHANGE_REQUEST, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'isUpdatingStatus'])).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS', () => {
    it('updates status and clears isUpdatingStatus', () => {
      const initial = Map({
        entities: Map({
          'posts.my-post': fromJS({ slug: 'my-post', status: 'draft', isUpdatingStatus: true }),
        }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS, {
          collection: 'posts',
          slug: 'my-post',
          newStatus: 'pending_review',
        }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'status'])).toBe('pending_review');
      expect(result.getIn(['entities', 'posts.my-post', 'isUpdatingStatus'])).toBe(false);
    });
  });

  describe('UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE', () => {
    it('sets isUpdatingStatus=false for the given collection.slug', () => {
      const initial = Map({
        entities: Map({
          'posts.my-post': fromJS({ slug: 'my-post', isUpdatingStatus: true }),
        }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_STATUS_CHANGE_FAILURE, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'isUpdatingStatus'])).toBe(false);
    });
  });

  describe('UNPUBLISHED_ENTRY_PUBLISH_REQUEST', () => {
    it('sets isPublishing=true for the given collection.slug', () => {
      const initial = Map({
        entities: Map({ 'posts.my-post': fromJS({ slug: 'my-post' }) }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PUBLISH_REQUEST, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post', 'isPublishing'])).toBe(true);
    });
  });

  describe('UNPUBLISHED_ENTRY_PUBLISH_SUCCESS', () => {
    it('removes the entity key for the published entry', () => {
      const initial = Map({
        entities: Map({
          'posts.my-post': fromJS({ slug: 'my-post', isPublishing: true }),
        }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PUBLISH_SUCCESS, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post'])).toBeUndefined();
    });
  });

  describe('UNPUBLISHED_ENTRY_PUBLISH_FAILURE', () => {
    it('returns state unchanged', () => {
      const initial = Map({
        entities: Map({
          'posts.my-post': fromJS({ slug: 'my-post', isPublishing: true }),
        }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_PUBLISH_FAILURE, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result).toBe(initial);
    });
  });

  describe('UNPUBLISHED_ENTRY_DELETE_SUCCESS', () => {
    it('removes the entity key for the deleted entry', () => {
      const initial = Map({
        entities: Map({
          'posts.my-post': fromJS({ slug: 'my-post' }),
          'posts.other-post': fromJS({ slug: 'other-post' }),
        }),
        pages: Map(),
      });
      const result = reducer(
        initial,
        action(UNPUBLISHED_ENTRY_DELETE_SUCCESS, { collection: 'posts', slug: 'my-post' }),
      );
      expect(result.getIn(['entities', 'posts.my-post'])).toBeUndefined();
      expect(result.getIn(['entities', 'posts.other-post'])).toBeDefined();
    });
  });
});
