import React from 'react';
import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { vi } from 'vitest';

import ConnectedCollection from '../Collection';

vi.mock('../Entries/EntriesCollection', () => ({ default: 'mock-entries-collection' }));
vi.mock('../CollectionTop', () => ({ default: 'mock-collection-top' }));
vi.mock('../CollectionControls', () => ({ default: 'mock-collection-controls' }));
vi.mock('../Sidebar', () => ({ default: 'mock-sidebar' }));

const middlewares = [];
const mockStore = configureStore(middlewares);

function renderWithRedux(component, { store } = {}) {
  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return render(component, { wrapper: Wrapper });
}

describe('Collection', () => {
  const collection = {
    name: 'pages',
    sortable_fields: [],
    view_filters: [],
    view_groups: [],
  };

  function makeStore(collectionOverride = {}) {
    return mockStore({
      collections: { pages: { ...collection, ...collectionOverride } },
      entries: {},
      config: { search: true },
    });
  }

  it('should render with collection without create url', () => {
    const store = makeStore({ create: false });
    const { asFragment } = renderWithRedux(
      <ConnectedCollection match={{ params: { name: 'pages' } }} />,
      { store },
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render with collection with create url', () => {
    const store = makeStore({ create: true });
    const { asFragment } = renderWithRedux(
      <ConnectedCollection match={{ params: { name: 'pages' } }} />,
      { store },
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render with collection with create url and path', () => {
    const store = makeStore({ create: true });
    const { asFragment } = renderWithRedux(
      <ConnectedCollection match={{ params: { name: 'pages', filterTerm: 'dir1/dir2' } }} />,
      { store },
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render connected component', () => {
    const store = makeStore();
    const { asFragment } = renderWithRedux(<ConnectedCollection match={{ params: {} }} />, {
      store,
    });
    expect(asFragment()).toMatchSnapshot();
  });
});
