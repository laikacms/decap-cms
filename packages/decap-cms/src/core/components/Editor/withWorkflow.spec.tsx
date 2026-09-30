import { render } from '@testing-library/react';
import configureMockStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { Provider } from 'react-redux';

import withWorkflow from '@/core/components/Editor/withWorkflow';
import { FOLDER } from '@/core/constants/collectionTypes';
import { EDITORIAL_WORKFLOW, SIMPLE } from '@/core/constants/publishModes';

const mockStore = configureMockStore([thunk]);

const EditorStub = vi.fn((_props: any) => null);
const WorkflowEditor = withWorkflow(EditorStub);

const postsCollection = { name: 'posts', type: FOLDER };

function buildState({
  publishMode = SIMPLE,
  collection = postsCollection as any,
  scopes,
  entities = {},
}: {
  publishMode?: string,
  collection?: any,
  scopes?: string[],
  entities?: Record<string, unknown>,
} = {}) {
  return {
    config: { publish_mode: publishMode },
    collections: collection ? { posts: collection } : {},
    auth: { user: scopes ? { scopes } : undefined },
    editorialWorkflow: { entities },
  };
}

function renderEditor(state: any, props: { newEntry?: boolean } = {}) {
  const store = mockStore(state);
  render(
    <Provider store={store}>
      <WorkflowEditor match={{ params: { name: 'posts', 0: 'my-post' } }} {...props} />
    </Provider>,
  );
  return { store, props: EditorStub.mock.calls.at(-1)![0] };
}

describe('withWorkflow', () => {
  beforeEach(() => {
    EditorStub.mockClear();
  });

  describe('publish mode', () => {
    it('passes no workflow props outside editorial workflow mode', () => {
      const { props } = renderEditor(
        buildState({ entities: { 'posts.my-post': { slug: 'my-post' } } }),
      );

      expect(props.isEditorialWorkflow).toBe(false);
      expect(props).not.toHaveProperty('loadEntry');
      expect(props).not.toHaveProperty('persistEntry');
      expect(props).not.toHaveProperty('unpublishedEntry');
      expect(props).not.toHaveProperty('entry');
    });

    it('passes loadEntry and persistEntry in editorial workflow mode', () => {
      const { props } = renderEditor(buildState({ publishMode: EDITORIAL_WORKFLOW }));

      expect(props.isEditorialWorkflow).toBe(true);
      expect(props.loadEntry).toEqual(expect.any(Function));
      expect(props.persistEntry).toEqual(expect.any(Function));
      expect(props).not.toHaveProperty('unpublishedEntry');
      expect(props).not.toHaveProperty('entry');
    });

    it('passes unpublishedEntry and entry when an unpublished entry exists', () => {
      const unpublished = { slug: 'my-post', status: 'draft' };
      const { props } = renderEditor(
        buildState({ publishMode: EDITORIAL_WORKFLOW, entities: { 'posts.my-post': unpublished } }),
      );

      expect(props.unpublishedEntry).toBe(true);
      expect(props.entry).toBe(unpublished);
    });

    it('forwards its own props to the wrapped editor', () => {
      const { props } = renderEditor(buildState(), { newEntry: true });

      expect(props.newEntry).toBe(true);
      expect(props.match).toEqual({ params: { name: 'posts', 0: 'my-post' } });
    });
  });

  describe('showDelete', () => {
    it('is false for a new entry', () => {
      const { props } = renderEditor(buildState(), { newEntry: true });
      expect(props.showDelete).toBe(false);
    });

    it('is false when the collection disallows deletion', () => {
      const { props } = renderEditor(
        buildState({ collection: { ...postsCollection, delete: false } }),
      );
      expect(props.showDelete).toBe(false);
    });

    it('is false when user scopes lack edit access', () => {
      const { props } = renderEditor(
        buildState({
          collection: { ...postsCollection, edit_scopes: ['posts:edit'] },
          scopes: ['posts:view'],
        }),
      );
      expect(props.showDelete).toBe(false);
    });

    it('is true when user scopes grant edit access', () => {
      const { props } = renderEditor(
        buildState({
          collection: { ...postsCollection, edit_scopes: ['posts:edit'] },
          scopes: ['posts:edit'],
        }),
      );
      expect(props.showDelete).toBe(true);
    });

    it('is true for an existing entry in an unrestricted collection', () => {
      const { props } = renderEditor(buildState());
      expect(props.showDelete).toBe(true);
    });
  });

  describe('missing collection', () => {
    it('does not throw for a new entry in editorial workflow mode', () => {
      expect(() =>
        renderEditor(buildState({ publishMode: EDITORIAL_WORKFLOW, collection: null }), { newEntry: true })
      ).not.toThrow();
      const props = EditorStub.mock.calls.at(-1)![0];
      expect(props.showDelete).toBe(false);
      expect(props).not.toHaveProperty('unpublishedEntry');
    });
  });
});
