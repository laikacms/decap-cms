import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import { RouterProvider } from '@/core/routing/context';
import { createDefaultRouter } from '@/core/routing/defaultRouter';
import ConnectedNestedCollection, {
  NestedCollection,
  getTreeData,
  walk,
  updateNode,
} from '@/core/components/Collection/NestedCollection';

import type * as DecapCmsUiDefault from '@/ui/default/index';

vi.mock('../../../../ui/default/index', async () => {
  const actual = await vi.importActual<typeof DecapCmsUiDefault>('../../../../ui/default/index');
  return {
    ...actual,
    Icon: 'mocked-icon',
  };
});

const middlewares = [];
const mockStore = configureStore(middlewares);

function renderWithRedux(component, { store } = {}) {
  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return render(component, { wrapper: Wrapper });
}

describe('NestedCollection', () => {
  const collection = {
    name: 'pages',
    label: 'Pages',
    folder: 'src/pages',
    fields: [{ name: 'title', widget: 'string' }],
    nested: {
      subfolders: false,
    },
  };

  it('should render correctly with no entries', () => {
    const entries = [];
    const { getByTestId } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} />
      </RouterProvider>,
    );

    expect(getByTestId('/')).toHaveTextContent('Pages');
    expect(getByTestId('/')).toHaveAttribute('href', '#/collections/pages');
  });

  it('should render correctly with nested entries', () => {
    const entries = [
      { path: 'src/pages/index.md', data: { title: 'Root' } },
      { path: 'src/pages/a/index.md', data: { title: 'File 1' } },
      { path: 'src/pages/b/index.md', data: { title: 'File 2' } },
      { path: 'src/pages/a/a/index.md', data: { title: 'File 3' } },
      { path: 'src/pages/b/a/index.md', data: { title: 'File 4' } },
    ];
    const { getByTestId } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} />
      </RouterProvider>,
    );

    // expand the tree
    fireEvent.click(getByTestId('/'));

    expect(getByTestId('/a')).toHaveTextContent('File 1');
    expect(getByTestId('/a')).toHaveAttribute('href', '#/collections/pages/filter/a');

    expect(getByTestId('/b')).toHaveTextContent('File 2');
    expect(getByTestId('/b')).toHaveAttribute('href', '#/collections/pages/filter/b');
  });

  it('should keep expanded nodes on re-render', () => {
    const entries = [
      { path: 'src/pages/index.md', data: { title: 'Root' } },
      { path: 'src/pages/a/index.md', data: { title: 'File 1' } },
      { path: 'src/pages/b/index.md', data: { title: 'File 2' } },
      { path: 'src/pages/a/a/index.md', data: { title: 'File 3' } },
      { path: 'src/pages/b/a/index.md', data: { title: 'File 4' } },
    ];
    const { getByTestId, rerender } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} />
      </RouterProvider>,
    );

    fireEvent.click(getByTestId('/'));
    fireEvent.click(getByTestId('/a'));

    expect(getByTestId('/a')).toHaveTextContent('File 1');

    const newEntries = [
      { path: 'src/pages/index.md', data: { title: 'Root' } },
      { path: 'src/pages/a/index.md', data: { title: 'File 1' } },
      { path: 'src/pages/b/index.md', data: { title: 'File 2' } },
      { path: 'src/pages/a/a/index.md', data: { title: 'File 3' } },
      { path: 'src/pages/b/a/index.md', data: { title: 'File 4' } },
      { path: 'src/pages/c/index.md', data: { title: 'File 5' } },
      { path: 'src/pages/c/a/index.md', data: { title: 'File 6' } },
    ];

    rerender(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={newEntries} />
      </RouterProvider>,
    );

    expect(getByTestId('/a')).toHaveTextContent('File 1');
  });

  it('should expand nodes based on filterTerm', () => {
    const entries = [
      { path: 'src/pages/index.md', data: { title: 'Root' } },
      { path: 'src/pages/a/index.md', data: { title: 'File 1' } },
      { path: 'src/pages/a/a/index.md', data: { title: 'File 2' } },
      { path: 'src/pages/a/a/a/index.md', data: { title: 'File 3' } },
    ];

    const { getByTestId, queryByTestId, rerender } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} />
      </RouterProvider>,
    );

    expect(queryByTestId('/a/a')).toBeNull();

    rerender(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} filterTerm={'a/a'} />
      </RouterProvider>,
    );

    expect(getByTestId('/a/a')).toHaveTextContent('File 2');
  });

  it('should ignore filterTerm once a user toggles an node', () => {
    const entries = [
      { path: 'src/pages/index.md', data: { title: 'Root' } },
      { path: 'src/pages/a/index.md', data: { title: 'File 1' } },
      { path: 'src/pages/a/a/index.md', data: { title: 'File 2' } },
      { path: 'src/pages/a/a/a/index.md', data: { title: 'File 3' } },
    ];

    const { getByTestId, queryByTestId, rerender } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} />
      </RouterProvider>,
    );

    rerender(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} filterTerm={'a/a'} />
      </RouterProvider>,
    );

    expect(getByTestId('/a/a')).toHaveTextContent('File 2');

    fireEvent.click(getByTestId('/a'));

    rerender(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={[...entries]} filterTerm={'a/a'} />
      </RouterProvider>,
    );

    expect(queryByTestId('/a/a')).toBeNull();
  });

  it('should not collapse an unselected node when clicked', () => {
    const entries = [
      { path: 'src/pages/index.md', data: { title: 'Root' } },
      { path: 'src/pages/a/index.md', data: { title: 'File 1' } },
      { path: 'src/pages/a/a/index.md', data: { title: 'File 2' } },
      { path: 'src/pages/a/a/a/index.md', data: { title: 'File 3' } },
      { path: 'src/pages/a/a/a/a/index.md', data: { title: 'File 4' } },
    ];

    const { getByTestId } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} />
      </RouterProvider>,
    );

    fireEvent.click(getByTestId('/'));
    fireEvent.click(getByTestId('/a'));
    fireEvent.click(getByTestId('/a/a'));

    expect(getByTestId('/a/a')).toHaveTextContent('File 2');
    fireEvent.click(getByTestId('/a'));
    expect(getByTestId('/a/a')).toHaveTextContent('File 2');
  });

  it('should collapse a selected node when clicked', () => {
    const entries = [
      { path: 'src/pages/index.md', data: { title: 'Root' } },
      { path: 'src/pages/a/index.md', data: { title: 'File 1' } },
      { path: 'src/pages/a/a/index.md', data: { title: 'File 2' } },
      { path: 'src/pages/a/a/a/index.md', data: { title: 'File 3' } },
      { path: 'src/pages/a/a/a/a/index.md', data: { title: 'File 4' } },
    ];

    const { getByTestId, queryByTestId } = render(
      <RouterProvider router={createDefaultRouter()}>
        <NestedCollection collection={collection} entries={entries} />
      </RouterProvider>,
    );

    fireEvent.click(getByTestId('/'));
    fireEvent.click(getByTestId('/a'));
    fireEvent.click(getByTestId('/a/a'));

    expect(getByTestId('/a/a/a')).toHaveTextContent('File 3');
    fireEvent.click(getByTestId('/a/a'));
    expect(queryByTestId('/a/a/a')).toBeNull();
  });

  it('should render connected component', () => {
    const entriesArray = [
      { slug: 'index', path: 'src/pages/index.md', data: { title: 'Root' } },
      { slug: 'a/index', path: 'src/pages/a/index.md', data: { title: 'File 1' } },
      { slug: 'b/index', path: 'src/pages/b/index.md', data: { title: 'File 2' } },
      { slug: 'a/a/index', path: 'src/pages/a/a/index.md', data: { title: 'File 3' } },
      { slug: 'b/a/index', path: 'src/pages/b/a/index.md', data: { title: 'File 4' } },
    ];
    const entries = entriesArray.reduce(
      (acc, entry) => {
        acc.entities[`${collection.name}.${entry.slug}`] = entry;
        acc.pages[collection.name].ids.push(entry.slug);
        return acc;
      },
      { pages: { [collection.name]: { ids: [] } }, entities: {} },
    );

    const store = mockStore({ entries });

    const { getByTestId } = renderWithRedux(
      <RouterProvider router={createDefaultRouter()}>
        <ConnectedNestedCollection collection={collection} entries={entries} />
      </RouterProvider>,
      { store },
    );

    // expand the root
    fireEvent.click(getByTestId('/'));

    expect(getByTestId('/a')).toHaveTextContent('File 1');
    expect(getByTestId('/a')).toHaveAttribute('href', '#/collections/pages/filter/a');

    expect(getByTestId('/b')).toHaveTextContent('File 2');
    expect(getByTestId('/b')).toHaveAttribute('href', '#/collections/pages/filter/b');
  });

  describe('getTreeData', () => {
    it('should return nested tree data from entries', () => {
      const entries = [
        { path: 'src/pages/index.md', data: { title: 'Root' } },
        { path: 'src/pages/intro/index.md', data: { title: 'intro index' } },
        { path: 'src/pages/intro/category/index.md', data: { title: 'intro category index' } },
        { path: 'src/pages/compliance/index.md', data: { title: 'compliance index' } },
      ];

      const treeData = getTreeData(collection, entries);

      expect(treeData).toEqual([
        {
          title: 'Pages',
          path: '/',
          isDir: true,
          isRoot: true,
          children: [
            {
              title: 'intro',
              path: '/intro',
              isDir: true,
              isRoot: false,
              children: [
                {
                  title: 'category',
                  path: '/intro/category',
                  isDir: true,
                  isRoot: false,
                  children: [
                    {
                      path: '/intro/category/index.md',
                      data: {
                        title: 'intro category index',
                        dirname: 'src/pages/intro/category',
                        extension: 'md',
                        filename: 'index',
                      },
                      title: 'intro category index',
                      isDir: false,
                      isRoot: false,
                      children: [],
                    },
                  ],
                },
                {
                  path: '/intro/index.md',
                  data: {
                    title: 'intro index',
                    dirname: 'src/pages/intro',
                    extension: 'md',
                    filename: 'index',
                  },
                  title: 'intro index',
                  isDir: false,
                  isRoot: false,
                  children: [],
                },
              ],
            },
            {
              title: 'compliance',
              path: '/compliance',
              isDir: true,
              isRoot: false,
              children: [
                {
                  path: '/compliance/index.md',
                  data: {
                    title: 'compliance index',
                    dirname: 'src/pages/compliance',
                    extension: 'md',
                    filename: 'index',
                  },
                  title: 'compliance index',
                  isDir: false,
                  isRoot: false,
                  children: [],
                },
              ],
            },
            {
              path: '/index.md',
              data: { title: 'Root', dirname: 'src/pages', extension: 'md', filename: 'index' },
              title: 'Root',
              isDir: false,
              isRoot: false,
              children: [],
            },
          ],
        },
      ]);
    });

    it('should ignore collection summary', () => {
      const entries = [{ path: 'src/pages/index.md', data: { title: 'Root' } }];

      const treeData = getTreeData(collection, entries);

      expect(treeData).toEqual([
        {
          title: 'Pages',
          path: '/',
          isDir: true,
          isRoot: true,
          children: [
            {
              path: '/index.md',
              data: { title: 'Root', dirname: 'src/pages', extension: 'md', filename: 'index' },
              title: 'Root',
              isDir: false,
              isRoot: false,
              children: [],
            },
          ],
        },
      ]);
    });

    it('should use nested collection summary for title', () => {
      const entries = [{ path: 'src/pages/index.md', data: { title: 'Root' } }];

      const treeData = getTreeData(
        { ...collection, nested: { ...collection.nested, summary: '{{filename}}' } },
        entries,
      );

      expect(treeData).toEqual([
        {
          title: 'Pages',
          path: '/',
          isDir: true,
          isRoot: true,
          children: [
            {
              path: '/index.md',
              data: { title: 'Root', dirname: 'src/pages', extension: 'md', filename: 'index' },
              title: 'index',
              isDir: false,
              isRoot: false,
              children: [],
            },
          ],
        },
      ]);
    });
  });

  describe('walk', () => {
    it('should visit every tree node', () => {
      const entries = [
        { path: 'src/pages/index.md', data: { title: 'Root' } },
        { path: 'src/pages/dir1/index.md', data: { title: 'Dir1 File' } },
        { path: 'src/pages/dir2/index.md', data: { title: 'Dir2 File' } },
      ];

      const treeData = getTreeData(collection, entries);
      const callback = vi.fn();
      walk(treeData, callback);

      expect(callback).toHaveBeenCalledTimes(6);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ path: '/' }));
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ path: '/index.md' }));
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ path: '/dir1' }));
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ path: '/dir2' }));
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ path: '/dir1/index.md' }));
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ path: '/dir2/index.md' }));
    });
  });

  describe('updateNode', () => {
    it('should update node', () => {
      const entries = [
        { path: 'src/pages/index.md', data: { title: 'Root' } },
        { path: 'src/pages/dir1/index.md', data: { title: 'Dir1 File' } },
        { path: 'src/pages/dir2/index.md', data: { title: 'Dir2 File' } },
      ];

      const treeData = getTreeData(collection, entries);
      expect(treeData[0].children[0].children[0].expanded).toBeUndefined();

      const callback = vi.fn(node => ({ ...node, expanded: true }));
      const node = { path: '/dir1/index.md' };
      updateNode(treeData, node, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(node);
      expect(treeData[0].children[0].children[0].expanded).toEqual(true);
    });
  });
});
