import { Collapsible } from '@base-ui/react/collapsible';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('keeps aria-controls on the collapsible-trigger expand button pointed at an existing panel id in both open and closed states (DCMS-1725)', () => {
    function Fixture() {
      const [collapsed, setCollapsed] = React.useState(false);
      return (
        <Collapsible.Root open={!collapsed} onOpenChange={open => setCollapsed(!open)}>
          <ListItemTopBar collapsibleTrigger panelId="item-panel" collapsed={collapsed} />
          <Collapsible.Panel id="item-panel" keepMounted>
            panel content
          </Collapsible.Panel>
        </Collapsible.Root>
      );
    }

    const { container } = render(<Fixture />);
    const expandButton = screen.getByTestId('expand-button');

    // Open state: Base UI already wires this up correctly on its own.
    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    expect(expandButton).toHaveAttribute('aria-controls', 'item-panel');
    expect(container.querySelector('#item-panel')).not.toBeNull();

    fireEvent.click(expandButton);

    // Closed state: upstream Base UI drops aria-controls here unless we
    // backfill it (the DCMS-1725 bug); it must still reference a real node.
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(expandButton).toHaveAttribute('aria-controls', 'item-panel');
    expect(container.querySelector('#item-panel')).not.toBeNull();
  });
});
