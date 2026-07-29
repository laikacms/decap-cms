import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('react-polyglot', () => ({
  translate: () => Component => Component,
}));

jest.mock('decap-cms-ui-default', () => {
  const actual = jest.requireActual('decap-cms-ui-default');
  return {
    ...actual,
    Icon: 'mocked-icon',
  };
});

import CollectionSearch from '../CollectionSearch';

describe('CollectionSearch', () => {
  const t = jest.fn(key => key);

  const collections = {
    posts: { name: 'posts', label: 'Posts' },
    pages: { name: 'pages', label: 'Pages' },
  };

  const defaultProps = {
    collections,
    searchTerm: '',
    onSubmit: jest.fn(),
    t,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the suggestion list when there is no query', () => {
    const { queryByText } = render(<CollectionSearch {...defaultProps} />);

    expect(queryByText('collection.sidebar.searchIn')).not.toBeInTheDocument();
    expect(queryByText('Posts')).not.toBeInTheDocument();
  });

  it('renders the suggestion list, including all collections and an "all collections" entry, once a query is typed', () => {
    const { getByPlaceholderText, getByText } = render(<CollectionSearch {...defaultProps} />);

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });

    expect(getByText('collection.sidebar.searchIn')).toBeInTheDocument();
    expect(getByText('collection.sidebar.allCollections')).toBeInTheDocument();
    expect(getByText('Posts')).toBeInTheDocument();
    expect(getByText('Pages')).toBeInTheDocument();
  });

  it('hides the suggestion list again when the query is cleared', () => {
    const { getByPlaceholderText, queryByText } = render(<CollectionSearch {...defaultProps} />);

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });
    fireEvent.change(input, { target: { value: '' } });

    expect(queryByText('collection.sidebar.searchIn')).not.toBeInTheDocument();
  });

  it('navigates the suggestion list with the down/up arrow keys', () => {
    const { getByPlaceholderText } = render(<CollectionSearch {...defaultProps} />);

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });

    // Move down twice: -1 (all collections) -> 0 (posts) -> 1 (pages)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onSubmit).toHaveBeenCalledWith('foo', 'pages');
  });

  it('does not move past the last suggestion when pressing down repeatedly', () => {
    const { getByPlaceholderText } = render(<CollectionSearch {...defaultProps} />);

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onSubmit).toHaveBeenCalledWith('foo', 'pages');
  });

  it('does not move before "all collections" when pressing up repeatedly', () => {
    const { getByPlaceholderText } = render(<CollectionSearch {...defaultProps} />);

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onSubmit).toHaveBeenCalledWith('foo');
  });

  it('submits the query with no collection when pressing enter without navigating', () => {
    const { getByPlaceholderText } = render(<CollectionSearch {...defaultProps} />);

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onSubmit).toHaveBeenCalledWith('bar');
  });

  it('closes the suggestion list when pressing escape', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <CollectionSearch {...defaultProps} />,
    );

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });
    expect(getByText('collection.sidebar.searchIn')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(queryByText('collection.sidebar.searchIn')).not.toBeInTheDocument();
  });

  it('calls onSubmit with the collection name when a suggestion is clicked', () => {
    const { getByPlaceholderText, getByText } = render(<CollectionSearch {...defaultProps} />);

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });

    fireEvent.click(getByText('Posts'));

    expect(defaultProps.onSubmit).toHaveBeenCalledWith('foo', 'posts');
  });

  it('calls onSubmit without a collection name when "all collections" is clicked', () => {
    const { getByPlaceholderText, getByText } = render(<CollectionSearch {...defaultProps} />);

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });

    fireEvent.click(getByText('collection.sidebar.allCollections'));

    expect(defaultProps.onSubmit).toHaveBeenCalledWith('foo');
  });

  it('defaults the selected suggestion to the currently active collection', () => {
    const collection = collections.pages;
    const { getByPlaceholderText } = render(
      <CollectionSearch {...defaultProps} collection={collection} />,
    );

    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'foo' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onSubmit).toHaveBeenCalledWith('foo', 'pages');
  });
});
