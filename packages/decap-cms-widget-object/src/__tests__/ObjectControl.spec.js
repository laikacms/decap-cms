import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { fromJS, Map } from 'immutable';

import ObjectControl from '../ObjectControl';

function MockEditorControl({ field, value, isDisabled, isHidden }) {
  return (
    <div
      data-testid={`editor-control-${field.get('name')}`}
      data-disabled={isDisabled ? 'true' : 'false'}
      data-hidden={isHidden ? 'true' : 'false'}
    >
      {value === undefined || value === null ? '' : String(value)}
    </div>
  );
}

const defaultProps = {
  onChangeObject: jest.fn(),
  onValidateObject: jest.fn(),
  classNameWrapper: 'classNameWrapper',
  forID: 'forID',
  editorControl: MockEditorControl,
  resolveWidget: jest.fn(),
  clearFieldErrors: jest.fn(),
  fieldsErrors: Map(),
  parentIds: [],
  t: key => key,
};

describe('ObjectControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('collapse/expand', () => {
    it('is expanded by default when field.collapsed is not set', () => {
      const field = fromJS({
        name: 'object',
        fields: [{ name: 'title', widget: 'string' }],
      });
      render(<ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hi' })} />);

      expect(screen.getByTestId('editor-control-title')).toBeInTheDocument();
      expect(screen.getByTestId('expand-button')).toHaveAttribute(
        'aria-label',
        'editor.editorWidgets.object.collapse',
      );
    });

    it('is collapsed by default when field.collapsed is true', () => {
      const field = fromJS({
        name: 'object',
        collapsed: true,
        fields: [{ name: 'title', widget: 'string' }],
      });
      render(<ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hi' })} />);

      expect(screen.getByTestId('expand-button')).toHaveAttribute(
        'aria-label',
        'editor.editorWidgets.object.expand',
      );
    });

    it('toggles collapsed state when the top bar expand button is clicked', () => {
      const field = fromJS({
        name: 'object',
        fields: [{ name: 'title', widget: 'string' }],
      });
      render(<ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hi' })} />);

      expect(screen.getByTestId('expand-button')).toHaveAttribute(
        'aria-label',
        'editor.editorWidgets.object.collapse',
      );

      fireEvent.click(screen.getByTestId('expand-button'));

      expect(screen.getByTestId('expand-button')).toHaveAttribute(
        'aria-label',
        'editor.editorWidgets.object.expand',
      );

      fireEvent.click(screen.getByTestId('expand-button'));

      expect(screen.getByTestId('expand-button')).toHaveAttribute(
        'aria-label',
        'editor.editorWidgets.object.collapse',
      );
    });

    it('uses the collapsed prop instead of internal state when forList is true', () => {
      const field = fromJS({
        name: 'object',
        fields: [{ name: 'title', widget: 'string' }],
      });
      const { rerender } = render(
        <ObjectControl
          {...defaultProps}
          field={field}
          forList
          collapsed={false}
          value={fromJS({ title: 'Hi' })}
        />,
      );

      // forList renders without its own top bar; content is driven by the `collapsed` prop
      expect(screen.getByTestId('editor-control-title')).toBeInTheDocument();

      rerender(
        <ObjectControl
          {...defaultProps}
          field={field}
          forList
          collapsed={true}
          value={fromJS({ title: 'Hi' })}
        />,
      );

      // still rendered in the DOM (hidden via CSS), no crash resolving state vs prop
      expect(screen.getByTestId('editor-control-title')).toBeInTheDocument();
      expect(screen.queryByTestId('expand-button')).not.toBeInTheDocument();
    });
  });

  describe('field vs fields resolution', () => {
    it('renders a single control when field.field (singular) is configured', () => {
      const field = fromJS({
        name: 'object',
        field: { name: 'title', widget: 'string' },
      });
      render(<ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hi' })} />);

      expect(screen.getByTestId('editor-control-title')).toBeInTheDocument();
    });

    it('renders one control per entry when field.fields (plural) is configured', () => {
      const field = fromJS({
        name: 'object',
        fields: [
          { name: 'first_name', widget: 'string' },
          { name: 'last_name', widget: 'string' },
        ],
      });
      render(
        <ObjectControl
          {...defaultProps}
          field={field}
          value={fromJS({ first_name: 'Jane', last_name: 'Doe' })}
        />,
      );

      expect(screen.getByTestId('editor-control-first_name')).toHaveTextContent('Jane');
      expect(screen.getByTestId('editor-control-last_name')).toHaveTextContent('Doe');
    });

    it('renders a fallback message when neither field nor fields is configured', () => {
      const field = fromJS({ name: 'object' });
      render(<ObjectControl {...defaultProps} field={field} value={Map()} />);

      expect(screen.getByText('No field(s) defined for this widget')).toBeInTheDocument();
    });

    it('skips hidden widgets when resolving fields', () => {
      const field = fromJS({
        name: 'object',
        fields: [
          { name: 'secret', widget: 'hidden' },
          { name: 'title', widget: 'string' },
        ],
      });
      render(
        <ObjectControl
          {...defaultProps}
          field={field}
          value={fromJS({ secret: 'shh', title: 'Hi' })}
        />,
      );

      expect(screen.queryByTestId('editor-control-secret')).not.toBeInTheDocument();
      expect(screen.getByTestId('editor-control-title')).toBeInTheDocument();
    });
  });

  describe('summary rendering', () => {
    it('shows the compiled summary as the collapsed heading', () => {
      const field = fromJS({
        name: 'object',
        collapsed: true,
        summary: 'Custom Summary Text',
        fields: [{ name: 'title', widget: 'string' }],
      });
      render(
        <ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hello World' })} />,
      );

      expect(screen.getByText('Custom Summary Text')).toBeInTheDocument();
    });

    it('substitutes {{fieldName}} placeholders in the summary against the Immutable Map value (DCMS-353)', () => {
      // `objectLabel` passes `value` (an Immutable.Map) into `compileStringTemplate`.
      // Regression test: placeholders must resolve to the real field value, not
      // an empty string, whether `value` is Immutable or a plain object.
      const field = fromJS({
        name: 'object',
        collapsed: true,
        summary: 'Title: {{title}}',
        fields: [{ name: 'title', widget: 'string' }],
      });
      render(
        <ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hello World' })} />,
      );

      expect(screen.getByText('Title: Hello World')).toBeInTheDocument();
    });

    it('falls back to the field label when no summary is configured', () => {
      const field = fromJS({
        name: 'object',
        label: 'My Object',
        collapsed: true,
        fields: [{ name: 'title', widget: 'string' }],
      });
      render(<ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hi' })} />);

      expect(screen.getByText('My Object')).toBeInTheDocument();
    });

    it('falls back to the field name when no summary or label is configured', () => {
      const field = fromJS({
        name: 'object_name',
        collapsed: true,
        fields: [{ name: 'title', widget: 'string' }],
      });
      render(<ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hi' })} />);

      expect(screen.getByText('object_name')).toBeInTheDocument();
    });

    it('does not show a heading when expanded', () => {
      const field = fromJS({
        name: 'object',
        collapsed: false,
        summary: 'Custom Summary Text',
        fields: [{ name: 'title', widget: 'string' }],
      });
      render(<ObjectControl {...defaultProps} field={field} value={fromJS({ title: 'Hi' })} />);

      // The nested field control is still in the DOM (collapsing only hides it
      // via CSS), but the top bar heading itself should be absent when expanded.
      expect(screen.queryByText('Custom Summary Text')).not.toBeInTheDocument();
      expect(screen.getByTestId('editor-control-title')).toBeInTheDocument();
    });
  });

  describe('hint/error display', () => {
    const field = fromJS({
      name: 'object',
      fields: [{ name: 'title', widget: 'string' }],
    });

    it('applies the normal border style when used in a list and there is no error', () => {
      const { container } = render(
        <ObjectControl
          {...defaultProps}
          field={field}
          forList
          hasError={false}
          value={fromJS({ title: 'Hi' })}
        />,
      );
      const wrapper = container.querySelector('#forID');

      expect(getComputedStyle(wrapper).borderColor).toBe('#dfdfe3');
    });

    it('does not apply the normal border style when used in a list and there is an error', () => {
      const { container } = render(
        <ObjectControl
          {...defaultProps}
          field={field}
          forList
          hasError={true}
          value={fromJS({ title: 'Hi' })}
        />,
      );
      const wrapper = container.querySelector('#forID');

      expect(getComputedStyle(wrapper).borderColor).not.toBe('#dfdfe3');
    });

    it('forwards fieldsErrors down to nested field controls', () => {
      function ErrorAwareControl({ field: f, fieldsErrors }) {
        return (
          <div data-testid={`editor-control-${f.get('name')}`}>
            {fieldsErrors && fieldsErrors.size > 0 ? 'has-errors' : 'no-errors'}
          </div>
        );
      }

      const fieldsErrors = fromJS({ title: [{ message: 'is required' }] });
      render(
        <ObjectControl
          {...defaultProps}
          editorControl={ErrorAwareControl}
          field={field}
          fieldsErrors={fieldsErrors}
          value={fromJS({ title: '' })}
        />,
      );

      expect(screen.getByTestId('editor-control-title')).toHaveTextContent('has-errors');
    });
  });
});
