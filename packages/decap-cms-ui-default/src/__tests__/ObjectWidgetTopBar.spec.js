import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { List, fromJS } from 'immutable';

import ObjectWidgetTopBar from '../ObjectWidgetTopBar';

function setup(overrides = {}) {
  const props = {
    allowAdd: false,
    onAdd: jest.fn(),
    onAddType: jest.fn(),
    onCollapseToggle: jest.fn(),
    collapsed: false,
    label: 'Item',
    t: key => key,
    ...overrides,
  };

  const utils = render(<ObjectWidgetTopBar {...props} />);
  return { ...utils, props };
}

describe('ObjectWidgetTopBar', () => {
  describe('renderAddUI', () => {
    it('renders no add UI when allowAdd is false', () => {
      setup({ allowAdd: false, types: List([fromJS({ name: 'typeA', label: 'Type A' })]) });

      expect(screen.queryByText('editor.editorWidgets.list.addType')).not.toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.list.add')).not.toBeInTheDocument();
    });

    it('renders the types dropdown when allowAdd is true and types is non-empty', () => {
      const types = List([
        fromJS({ name: 'typeA', label: 'Type A' }),
        fromJS({ name: 'typeB', label: 'Type B' }),
      ]);
      setup({ allowAdd: true, types });

      expect(screen.getByText('editor.editorWidgets.list.addType')).toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.list.add')).not.toBeInTheDocument();
    });

    it('fires onAddType with the clicked type name when a dropdown item is clicked', () => {
      const types = List([
        fromJS({ name: 'typeA', label: 'Type A' }),
        fromJS({ name: 'typeB', label: 'Type B' }),
      ]);
      const { props } = setup({ allowAdd: true, types });

      fireEvent.click(screen.getByText('editor.editorWidgets.list.addType'));
      fireEvent.click(screen.getByText('Type B'));

      expect(props.onAddType).toHaveBeenCalledWith('typeB');
    });

    it('renders the plain add button when allowAdd is true and types is empty', () => {
      setup({ allowAdd: true, types: List() });

      expect(screen.getByText('editor.editorWidgets.list.add')).toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.list.addType')).not.toBeInTheDocument();
    });

    it('renders the plain add button when allowAdd is true and types is not provided', () => {
      setup({ allowAdd: true, types: undefined });

      expect(screen.getByText('editor.editorWidgets.list.add')).toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.list.addType')).not.toBeInTheDocument();
    });

    it('fires onAdd when the plain add button is clicked', () => {
      const { props } = setup({ allowAdd: true, types: List() });

      fireEvent.click(screen.getByText('editor.editorWidgets.list.add'));

      expect(props.onAdd).toHaveBeenCalled();
    });
  });

  describe('collapse toggle', () => {
    it('shows the "expand" aria-label when collapsed is true', () => {
      setup({ collapsed: true });

      expect(screen.getByTestId('expand-button')).toHaveAttribute(
        'aria-label',
        'editor.editorWidgets.object.expand',
      );
    });

    it('shows the "collapse" aria-label when collapsed is false', () => {
      setup({ collapsed: false });

      expect(screen.getByTestId('expand-button')).toHaveAttribute(
        'aria-label',
        'editor.editorWidgets.object.collapse',
      );
    });

    it('fires onCollapseToggle when the expand button is clicked', () => {
      const { props } = setup({ collapsed: false });

      fireEvent.click(screen.getByTestId('expand-button'));

      expect(props.onCollapseToggle).toHaveBeenCalled();
    });
  });
});
