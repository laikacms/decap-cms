import React from 'react';
import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { vi } from 'vitest';

import ConnectedCollection, { Collection } from '../Collection';

vi.mock('../Entries/EntriesCollection', () => 'mock-entries-collection');
vi.mock('../CollectionTop', () => 'mock-collection-top');
vi.mock('../CollectionControls', () => 'mock-collection-controls');
vi.mock('../Sidebar', () => 'mock-sidebar');

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
  const props = {
    collections: { pages: collection },
    collection,
    collectionName: collection.name,
    t: vi.fn(key => key),
    onSortClick: vi.fn(),
  };

  it('should render with collection without create url', () => {
    const { asFragment } = render(
      <Collection {...props} collection={{ ...collection, create: false }} />,
    );

    expect(asFragment()).toMatchSnapshot();
  });
  it('should render with collection with create url', () => {
    const { asFragment } = render(
      <Collection {...props} collection={{ ...collection, create: true }} />,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it('should render with collection with create url and path', () => {
    const { asFragment } = render(
      <Collection
        {...props}
        collection={{ ...collection, create: true }}
        filterTerm="dir1/dir2"
      />,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it('should render connected component', () => {
    const store = mockStore({
      collections: props.collections,
      entries: {},
    });

    const { asFragment } = renderWithRedux(<ConnectedCollection match={{ params: {} }} />, {
      store,
    });

    expect(asFragment()).toMatchSnapshot();
  });
});
