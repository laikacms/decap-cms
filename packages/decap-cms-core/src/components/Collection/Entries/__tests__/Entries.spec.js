import React from 'react';
import { render, screen } from '@testing-library/react';
import { fromJS, Set } from 'immutable';

jest.mock('react-polyglot', () => ({
  translate: () => Component => Component,
}));

jest.mock('../EntryListing', () =>
  jest.fn(props => (
    <div data-testid="entry-listing" data-page={props.page} data-entry-count={props.entries.size} />
  )),
);

import Entries from '../Entries';
import EntryListing from '../EntryListing';

function t(key) {
  return key;
}
const collections = fromJS({ name: 'posts', label: 'Posts' });

function makeEntries(slugs) {
  return fromJS(slugs.map(slug => ({ slug })));
}

describe('Entries', () => {
  const baseProps = {
    collections,
    cursor: {},
    handleCursorActions: jest.fn(),
    t,
    getWorkflowStatus: jest.fn(),
    getUnpublishedEntries: jest.fn(() => []),
  };

  beforeEach(() => {
    EntryListing.mockClear();
  });

  it('renders the loader while the initial fetch is in progress', () => {
    render(<Entries {...baseProps} isFetching page={undefined} entries={makeEntries([])} />);

    // The loader rotates through the loading/caching/longer-loading messages;
    // only the first is shown on initial render.
    expect(screen.getByText('collection.entries.loadingEntries')).toBeInTheDocument();
    expect(screen.queryByTestId('entry-listing')).not.toBeInTheDocument();
  });

  it('renders the no-entries message when there are no entries and no more pages to load', () => {
    render(<Entries {...baseProps} isFetching={false} entries={makeEntries([])} cursor={{}} />);

    expect(screen.getByText('collection.entries.noEntries')).toBeInTheDocument();
    expect(screen.queryByTestId('entry-listing')).not.toBeInTheDocument();
  });

  it('renders EntryListing with the paginated entries', () => {
    const entries = makeEntries(['first-post', 'second-post']);

    render(<Entries {...baseProps} isFetching={false} entries={entries} page={1} />);

    const listing = screen.getByTestId('entry-listing');
    expect(listing).toBeInTheDocument();
    expect(listing).toHaveAttribute('data-page', '1');
    expect(listing).toHaveAttribute('data-entry-count', '2');
    expect(screen.queryByText('collection.entries.noEntries')).not.toBeInTheDocument();
    // No further page is loading, so no pagination message should show.
    expect(screen.queryByText('collection.entries.loadingEntries')).not.toBeInTheDocument();
  });

  it('shows a pagination loading message below the listing while fetching a further page', () => {
    const entries = makeEntries(['first-post']);

    render(<Entries {...baseProps} isFetching entries={entries} page={2} />);

    expect(screen.getByTestId('entry-listing')).toBeInTheDocument();
    expect(screen.getByText('collection.entries.loadingEntries')).toBeInTheDocument();
  });

  it('renders EntryListing when there are no loaded entries but the cursor can load more (cursor-based load-more)', () => {
    const cursor = { actions: Set(['append_next']) };

    render(
      <Entries
        {...baseProps}
        isFetching={false}
        entries={makeEntries([])}
        cursor={cursor}
        page={0}
      />,
    );

    expect(screen.getByTestId('entry-listing')).toBeInTheDocument();
    expect(screen.queryByText('collection.entries.noEntries')).not.toBeInTheDocument();
    expect(EntryListing).toHaveBeenCalledWith(
      expect.objectContaining({ cursor, handleCursorActions: baseProps.handleCursorActions }),
      undefined,
    );
  });
});
