import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { fromJS, OrderedMap } from 'immutable';

import withWorkflow from '../withWorkflow';
import { EDITORIAL_WORKFLOW, SIMPLE } from '../../../constants/publishModes';

jest.mock('../../../actions/editorialWorkflow', () => ({
  loadUnpublishedEntry: jest.fn((collection, slug) => ({
    type: 'MOCK_LOAD_UNPUBLISHED_ENTRY',
    collection,
    slug,
  })),
  persistUnpublishedEntry: jest.fn((collection, unpublishedEntry) => ({
    type: 'MOCK_PERSIST_UNPUBLISHED_ENTRY',
    collection,
    unpublishedEntry,
  })),
}));

const {
  loadUnpublishedEntry,
  persistUnpublishedEntry,
} = require('../../../actions/editorialWorkflow');

function createFakeStore(state) {
  return {
    getState: () => state,
    subscribe: () => () => {},
    dispatch: jest.fn(),
  };
}

function createState({ publishMode, collection, unpublishedEntries = {} }) {
  return {
    config: { publish_mode: publishMode },
    collections: OrderedMap({ posts: fromJS(collection) }),
    editorialWorkflow: fromJS({ entities: unpublishedEntries }),
  };
}

let receivedProps;
// eslint-disable-next-line react/display-name
function MockEditor(props) {
  receivedProps = props;
  return <mock-editor />;
}

function renderWithWorkflow(state, ownProps) {
  receivedProps = undefined;
  const store = createFakeStore(state);
  const WrappedEditor = withWorkflow(MockEditor);
  render(
    <Provider store={store}>
      <WrappedEditor {...ownProps} />
    </Provider>,
  );
  return { store, props: receivedProps };
}

describe('withWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapStateToProps', () => {
    it('sets isEditorialWorkflow to false when publish_mode is not editorial_workflow', () => {
      const state = createState({
        publishMode: SIMPLE,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
      });

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
      });

      expect(props.isEditorialWorkflow).toBe(false);
      expect(props.unpublishedEntry).toBeUndefined();
      expect(props.entry).toBeUndefined();
    });

    it('sets isEditorialWorkflow to true when publish_mode is editorial_workflow', () => {
      const state = createState({
        publishMode: EDITORIAL_WORKFLOW,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
      });

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
      });

      expect(props.isEditorialWorkflow).toBe(true);
    });

    it('sets unpublishedEntry and entry when an unpublished entry exists for the slug', () => {
      const unpublishedEntry = fromJS({ slug: 'slug', collection: 'posts' });
      const state = createState({
        publishMode: EDITORIAL_WORKFLOW,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
        unpublishedEntries: { 'posts.slug': unpublishedEntry },
      });

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
      });

      expect(props.unpublishedEntry).toBe(true);
      expect(props.entry).toEqual(unpublishedEntry);
    });

    it('does not set unpublishedEntry or entry when no unpublished entry exists for the slug', () => {
      const state = createState({
        publishMode: EDITORIAL_WORKFLOW,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
        unpublishedEntries: {},
      });

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
      });

      expect(props.unpublishedEntry).toBeUndefined();
      expect(props.entry).toBeUndefined();
    });

    it('sets showDelete to false when the entry is new, even if the collection allows deletion', () => {
      const state = createState({
        publishMode: SIMPLE,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
      });

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: true,
      });

      expect(props.showDelete).toBe(false);
    });

    it('sets showDelete to false when the collection does not allow deletion', () => {
      const state = createState({
        publishMode: SIMPLE,
        collection: { name: 'posts', type: 'folder_based_collection', delete: false },
      });

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
      });

      expect(props.showDelete).toBe(false);
    });

    it('sets showDelete to true when the entry is not new and the collection allows deletion', () => {
      const state = createState({
        publishMode: SIMPLE,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
      });

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
      });

      expect(props.showDelete).toBe(true);
    });
  });

  describe('mergeProps', () => {
    it('passes loadEntry and persistEntry through from ownProps when not an editorial workflow', () => {
      const state = createState({
        publishMode: SIMPLE,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
      });
      const ownLoadEntry = jest.fn();
      const ownPersistEntry = jest.fn();

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
        loadEntry: ownLoadEntry,
        persistEntry: ownPersistEntry,
      });

      expect(props.loadEntry).toBe(ownLoadEntry);
      expect(props.persistEntry).toBe(ownPersistEntry);
      expect(loadUnpublishedEntry).not.toHaveBeenCalled();
      expect(persistUnpublishedEntry).not.toHaveBeenCalled();
    });

    it('overrides loadEntry to dispatch loadUnpublishedEntry when an editorial workflow', () => {
      const state = createState({
        publishMode: EDITORIAL_WORKFLOW,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
      });
      const ownLoadEntry = jest.fn();

      const { store, props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
        loadEntry: ownLoadEntry,
      });

      expect(props.loadEntry).not.toBe(ownLoadEntry);

      const collection = fromJS({ name: 'posts' });
      props.loadEntry(collection, 'slug');

      expect(ownLoadEntry).not.toHaveBeenCalled();
      expect(loadUnpublishedEntry).toHaveBeenCalledWith(collection, 'slug');
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'MOCK_LOAD_UNPUBLISHED_ENTRY',
        collection,
        slug: 'slug',
      });
    });

    it('overrides persistEntry to dispatch persistUnpublishedEntry when an editorial workflow', () => {
      const unpublishedEntry = fromJS({ slug: 'slug', collection: 'posts' });
      const state = createState({
        publishMode: EDITORIAL_WORKFLOW,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
        unpublishedEntries: { 'posts.slug': unpublishedEntry },
      });
      const ownPersistEntry = jest.fn();

      const { store, props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
        persistEntry: ownPersistEntry,
      });

      expect(props.persistEntry).not.toBe(ownPersistEntry);

      const collection = fromJS({ name: 'posts' });
      props.persistEntry(collection);

      expect(ownPersistEntry).not.toHaveBeenCalled();
      expect(persistUnpublishedEntry).toHaveBeenCalledWith(collection, true);
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'MOCK_PERSIST_UNPUBLISHED_ENTRY',
        collection,
        unpublishedEntry: true,
      });
    });

    it('passes other own props and state props through unmodified', () => {
      const state = createState({
        publishMode: SIMPLE,
        collection: { name: 'posts', type: 'folder_based_collection', delete: true },
      });

      const { props } = renderWithWorkflow(state, {
        match: { params: { name: 'posts', 0: 'slug' } },
        newEntry: false,
        someOtherProp: 'hello',
      });

      expect(props.someOtherProp).toBe('hello');
      expect(props.isEditorialWorkflow).toBe(false);
      expect(props.showDelete).toBe(true);
    });
  });
});
