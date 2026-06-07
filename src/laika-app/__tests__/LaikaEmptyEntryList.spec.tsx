import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const dispatch = vi.fn();

vi.mock('../../core/hooks/useRedux', () => ({
  useAppDispatch: () => dispatch,
}));

vi.mock('../../core/actions/collections', () => ({
  createNewEntry: (name: string) => ({ type: 'CREATE_NEW_ENTRY', payload: name }),
}));

import LaikaEmptyEntryList from '../LaikaEmptyEntryList';

describe('LaikaEmptyEntryList', () => {
  it('renders a friendly empty title for a collection', () => {
    const { getByText } = render(
      <LaikaEmptyEntryList
        collection={{
          name: 'posts',
          label: 'Posts',
          label_singular: 'Post',
          type: 'folder_based_collection',
          create: true,
        } as any}
      />,
    );
    expect(getByText('No posts yet')).toBeInTheDocument();
    expect(getByText(/Get started by creating your first post/)).toBeInTheDocument();
  });

  it('shows a Create CTA only when the collection supports creation', () => {
    const { getByText, queryByText, rerender } = render(
      <LaikaEmptyEntryList
        collection={{ name: 'posts', label: 'Posts', label_singular: 'Post', create: true } as any}
      />,
    );
    expect(getByText('Create Post')).toBeInTheDocument();

    rerender(
      <LaikaEmptyEntryList
        collection={{ name: 'posts', label: 'Posts', label_singular: 'Post', create: false } as any}
      />,
    );
    expect(queryByText('Create Post')).toBeNull();
  });

  it('dispatches createNewEntry when CTA is clicked', () => {
    dispatch.mockClear();
    const { getByText } = render(
      <LaikaEmptyEntryList
        collection={{ name: 'posts', label: 'Posts', label_singular: 'Post', create: true } as any}
      />,
    );
    fireEvent.click(getByText('Create Post'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'CREATE_NEW_ENTRY', payload: 'posts' });
  });

  it('falls back to "No matches" without a CTA when no collection is provided', () => {
    const { getByText, queryByRole } = render(<LaikaEmptyEntryList />);
    expect(getByText('No matches')).toBeInTheDocument();
    expect(queryByRole('button')).toBeNull();
  });
});
