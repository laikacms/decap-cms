import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const createNewEntry = vi.fn();

vi.mock('../../core/actions/collections', () => ({
  createNewEntry: (...args: unknown[]) => createNewEntry(...args),
}));

import LaikaEmptyEntryList from '@/laika-app/LaikaEmptyEntryList';

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

  it('calls createNewEntry directly (not via dispatch) when CTA is clicked', () => {
    createNewEntry.mockClear();
    const { getByText } = render(
      <LaikaEmptyEntryList
        collection={{ name: 'posts', label: 'Posts', label_singular: 'Post', create: true } as any}
      />,
    );
    fireEvent.click(getByText('Create Post'));
    expect(createNewEntry).toHaveBeenCalledWith('posts');
  });

  it('falls back to "No matches" without a CTA when no collection is provided', () => {
    const { getByText, queryByRole } = render(<LaikaEmptyEntryList />);
    expect(getByText('No matches')).toBeInTheDocument();
    expect(queryByRole('button')).toBeNull();
  });
});
