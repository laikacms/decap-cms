import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import ListItemTopBar from '../ListItemTopBar';

function DragHandleWrapper({ id, children }) {
  return (
    <div data-testid="drag-handle-wrapper" id={id}>
      {children}
    </div>
  );
}

function setup(overrides = {}) {
  const props = {
    collapsed: false,
    onCollapseToggle: jest.fn(),
    onRemove: jest.fn(),
    allowRemove: true,
    dragHandle: DragHandleWrapper,
    allowReorder: true,
    id: 'item-1',
    ...overrides,
  };

  const utils = render(<ListItemTopBar {...props} />);
  return { ...utils, props };
}

describe('ListItemTopBar', () => {
  describe('collapse button', () => {
    it('renders the collapse button when onCollapseToggle is passed', () => {
      setup({ onCollapseToggle: jest.fn() });

      expect(screen.getByLabelText('Collapse item')).toBeInTheDocument();
    });

    it('does not render the collapse button when onCollapseToggle is not passed', () => {
      setup({ onCollapseToggle: undefined });

      expect(screen.queryByLabelText('Collapse item')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Expand item')).not.toBeInTheDocument();
    });

    it('fires onCollapseToggle when the collapse button is clicked', () => {
      const { props } = setup({ onCollapseToggle: jest.fn() });

      fireEvent.click(screen.getByLabelText('Collapse item'));

      expect(props.onCollapseToggle).toHaveBeenCalled();
    });

    it('shows "Collapse item" aria-label when collapsed is false', () => {
      setup({ collapsed: false });

      expect(screen.getByLabelText('Collapse item')).toBeInTheDocument();
      expect(screen.queryByLabelText('Expand item')).not.toBeInTheDocument();
    });

    it('shows "Expand item" aria-label when collapsed is true', () => {
      setup({ collapsed: true });

      expect(screen.getByLabelText('Expand item')).toBeInTheDocument();
      expect(screen.queryByLabelText('Collapse item')).not.toBeInTheDocument();
    });
  });

  describe('drag handle', () => {
    it('renders the drag handle when dragHandle and allowReorder are both set', () => {
      setup({ dragHandle: DragHandleWrapper, allowReorder: true });

      expect(screen.getByTestId('drag-handle-wrapper')).toBeInTheDocument();
    });

    it('does not render the drag handle when allowReorder is false', () => {
      setup({ dragHandle: DragHandleWrapper, allowReorder: false });

      expect(screen.queryByTestId('drag-handle-wrapper')).not.toBeInTheDocument();
    });

    it('does not render the drag handle when dragHandle is not provided', () => {
      setup({ dragHandle: undefined, allowReorder: true });

      expect(screen.queryByTestId('drag-handle-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('remove button', () => {
    it('renders the remove button when onRemove and allowRemove are both set', () => {
      setup({ onRemove: jest.fn(), allowRemove: true });

      expect(screen.getByLabelText('Remove item')).toBeInTheDocument();
    });

    it('does not render the remove button when allowRemove is false', () => {
      setup({ onRemove: jest.fn(), allowRemove: false });

      expect(screen.queryByLabelText('Remove item')).not.toBeInTheDocument();
    });

    it('does not render the remove button when onRemove is not provided', () => {
      setup({ onRemove: undefined, allowRemove: true });

      expect(screen.queryByLabelText('Remove item')).not.toBeInTheDocument();
    });

    it('fires onRemove when the remove button is clicked', () => {
      const { props } = setup({ onRemove: jest.fn(), allowRemove: true });

      fireEvent.click(screen.getByLabelText('Remove item'));

      expect(props.onRemove).toHaveBeenCalled();
    });
  });
});
