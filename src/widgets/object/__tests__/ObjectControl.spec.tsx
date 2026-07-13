import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import ObjectControl from '../ObjectControl';

import type { ObjectControlHandle } from '../ObjectControl';

function createMockEditorControl(validateSpy: (name: string, value: unknown) => void) {
  return function MockEditorControl(props: Record<string, any>) {
    React.useEffect(() => {
      props.controlRef({
        props: { field: props.field },
        validate: () => validateSpy(props.field.name, props.value),
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid={`editor-control-${props.field.name}`} />;
  };
}

describe('ObjectControl', () => {
  const baseProps = {
    onChangeObject: vi.fn(),
    onValidateObject: vi.fn(),
    clearFieldErrors: vi.fn(),
    resolveWidget: vi.fn(),
    classNameWrapper: 'classNameWrapper',
    forID: 'forID',
    t: (key: string) => key,
  };

  it('renders and validates all sub-fields when configured with `fields`', () => {
    const validateSpy = vi.fn();
    const field = {
      name: 'author',
      widget: 'object',
      fields: [
        { name: 'first_name', widget: 'string' },
        { name: 'last_name', widget: 'string' },
      ],
    };

    let handle: ObjectControlHandle | null = null;
    const { getByTestId } = render(
      <ObjectControl
        {...(baseProps as any)}
        field={field}
        value={{ first_name: 'hello', last_name: 'world' }}
        editorControl={createMockEditorControl(validateSpy)}
        ref={h => (handle = h)}
      />,
    );

    expect(getByTestId('editor-control-first_name')).toBeInTheDocument();
    expect(getByTestId('editor-control-last_name')).toBeInTheDocument();

    handle!.validate();
    expect(validateSpy).toHaveBeenCalledWith('first_name', 'hello');
    expect(validateSpy).toHaveBeenCalledWith('last_name', 'world');
  });

  it('renders and validates the sub-field when configured with a singular `field` (single-field list item)', () => {
    const validateSpy = vi.fn();
    const field = {
      name: 'tags',
      widget: 'list',
      field: { name: 'tag', widget: 'string' },
    };

    let handle: ObjectControlHandle | null = null;
    const { getByTestId } = render(
      <ObjectControl
        {...(baseProps as any)}
        field={field}
        forList
        value="a scalar item"
        editorControl={createMockEditorControl(validateSpy)}
        ref={h => (handle = h)}
      />,
    );

    expect(getByTestId('editor-control-tag')).toBeInTheDocument();

    expect(() => handle!.validate()).not.toThrow();
    expect(validateSpy).toHaveBeenCalledWith('tag', 'a scalar item');
  });

  it('renders a message when neither `field` nor `fields` is defined', () => {
    const validateSpy = vi.fn();
    const field = { name: 'broken', widget: 'object' };

    let handle: ObjectControlHandle | null = null;
    const { getByText } = render(
      <ObjectControl
        {...(baseProps as any)}
        field={field}
        editorControl={createMockEditorControl(validateSpy)}
        ref={h => (handle = h)}
      />,
    );

    expect(getByText('No field(s) defined for this widget')).toBeInTheDocument();
    expect(() => handle!.validate()).not.toThrow();
  });
});
