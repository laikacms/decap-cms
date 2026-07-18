import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import ListItemTopBar from '@/ui/default/ListItemTopBar';

describe('ListItemTopBar', () => {
  const DragWrapper: React.ComponentType<{ id?: string, children: React.ReactNode }> = ({
    children,
  }) => <div data-testid="drag-handle-wrapper">{children}</div>;

  it('hides the remove button when allowRemove is false', () => {
    render(<ListItemTopBar onRemove={vi.fn()} allowRemove={false} />);

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('renders the remove button when allowRemove is true', () => {
    render(<ListItemTopBar onRemove={vi.fn()} allowRemove />);

    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('hides the drag handle when allowReorder is false', () => {
    render(<ListItemTopBar dragHandle={DragWrapper} allowReorder={false} />);

    expect(screen.queryByTestId('drag-handle-wrapper')).not.toBeInTheDocument();
  });

  it('renders the drag handle when allowReorder is true', () => {
    render(<ListItemTopBar dragHandle={DragWrapper} allowReorder />);

    expect(screen.getByTestId('drag-handle-wrapper')).toBeInTheDocument();
  });
});
