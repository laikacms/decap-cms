import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock react-polyglot's useTranslate to return a passthrough.
vi.mock('react-polyglot', () => ({
  useTranslate: () => (key: string) => key,
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

vi.mock('../../core/hooks/useRedux', () => ({
  useAppDispatch: () => () => undefined,
  useAppSelector: (selector: (s: unknown) => unknown) => selector({}),
}));

vi.mock('../../core/actions/media', () => ({
  boundGetAsset: () => () => ({ toString: () => 'asset://example.png' }),
}));

vi.mock('../../core/reducers/collections', () => ({
  selectEntryCollectionTitle: (collection: { label: string }, entry: { slug: string }) =>
    'Title for ' + entry.slug,
}));

import LaikaEntryCard from '@/laika-app/LaikaEntryCard';

const baseProps = {
  collection: {
    name: 'posts',
    label: 'Posts',
    type: 'folder_based_collection',
  } as any,
  entry: {
    slug: 'hello-world',
    data: { title: 'Hello world', body: 'Body' },
  } as any,
  inferredFields: { imageField: null },
  viewStyle: 'VIEW_STYLE_LIST',
  workflowStatus: null,
};

describe('LaikaEntryCard', () => {
  it('renders the entry title and links to the editor', () => {
    const { getByText, getByRole } = render(
      <MemoryRouter>
        <LaikaEntryCard {...baseProps} />
      </MemoryRouter>,
    );
    expect(getByText('Title for hello-world')).toBeInTheDocument();
    const link = getByRole('link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/collections/posts/entries/hello-world');
  });

  it('shows the workflow badge with the appropriate intent', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaEntryCard {...baseProps} workflowStatus="draft" />
      </MemoryRouter>,
    );
    // Mocked t returns the key — the badge text is the i18n key.
    expect(getByText('editor.editorToolbar.draft')).toBeInTheDocument();
  });

  it('renders in grid view without throwing', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaEntryCard {...baseProps} viewStyle="VIEW_STYLE_GRID" />
      </MemoryRouter>,
    );
    expect(getByText('Title for hello-world')).toBeInTheDocument();
  });

  it('shows the collection label when supplied (multi-collection listings)', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaEntryCard {...baseProps} collectionLabel="Posts" />
      </MemoryRouter>,
    );
    expect(getByText('Posts')).toBeInTheDocument();
  });
});
