import React, { Component } from 'react';
import { act, render, screen } from '@testing-library/react';
import { fromJS, List } from 'immutable';
import { z } from 'zod';

import Widget from '../Widget';
import ValidationErrorTypes from '../../../../constants/validationErrorTypes';

function createWidget(props) {
  return new Widget({
    t: (key, options = {}) => `${key}${options.pattern ? `:${options.pattern}` : ''}`,
    parentIds: [],
    ...props,
  });
}

describe('Widget', () => {
  describe('validatePattern', () => {
    it('validates a scalar (string) widget value against the pattern', () => {
      const field = fromJS({ name: 'title', pattern: ['^[a-z]+$', 'lowercase only'] });
      const widget = createWidget({ field, value: 'hello' });

      expect(widget.validatePattern(field, 'hello')).toEqual({ error: false });

      const result = widget.validatePattern(field, 'Hello');
      expect(result.error).toBeTruthy();
      expect(result.error.type).toBe(ValidationErrorTypes.PATTERN);
    });

    it('does not toString()-coerce an Immutable List value for list-like widgets', () => {
      // getValidateValue is responsible for normalizing the raw widget value
      // (e.g. an Immutable List for a `list`/multi-`select` widget) into a
      // string that reflects its actual content before pattern validation.
      const field = fromJS({ name: 'tags', widget: 'list', pattern: ['^a,b$', 'must be a,b'] });
      const rawValue = List(['a', 'b']);
      const widget = createWidget({ field, value: rawValue });

      const validateValue = widget.getValidateValue();
      expect(validateValue).toBe('a,b');
      expect(validateValue).not.toContain('List');

      expect(widget.validatePattern(field, validateValue)).toEqual({ error: false });

      const mismatchWidget = createWidget({ field, value: List(['a', 'c']) });
      const result = mismatchWidget.validatePattern(field, mismatchWidget.getValidateValue());
      expect(result.error).toBeTruthy();
      expect(result.error.type).toBe(ValidationErrorTypes.PATTERN);
    });

    it('does not toString()-coerce an Immutable Map value for object widgets', () => {
      const field = fromJS({
        name: 'meta',
        widget: 'object',
        pattern: ['^\\{"a":1\\}$', 'must serialize to {"a":1}'],
      });
      const rawValue = fromJS({ a: 1 });
      const widget = createWidget({ field, value: rawValue });

      const validateValue = widget.getValidateValue();
      expect(validateValue).toBe('{"a":1}');
      expect(validateValue).not.toContain('Map');

      expect(widget.validatePattern(field, validateValue)).toEqual({ error: false });

      const mismatchWidget = createWidget({ field, value: fromJS({ a: 2 }) });
      const result = mismatchWidget.validatePattern(field, mismatchWidget.getValidateValue());
      expect(result.error).toBeTruthy();
      expect(result.error.type).toBe(ValidationErrorTypes.PATTERN);
    });
  });

  describe('shouldComponentUpdate delegation into wrapped controls (DCMS-1693)', () => {
    // Regression test for the DCMS-1689 follow-up: Widget.shouldComponentUpdate
    // used to delegate to a wrapped control's own `shouldComponentUpdate` by
    // splicing in Widget's *own* `nextState` (always `null`, since Widget never
    // calls `setState`) instead of the wrapped control's. Any wrapped control
    // whose own `shouldComponentUpdate` reads `nextState` (e.g.
    // decap-cms-widget-relation's RelationControl, DCMS-1421's `quickAdd` local
    // state) crashed reading a property off `null`.
    //
    // This renders a real Widget wrapping a plain React.Component control - the
    // same shape RelationControl has - whose own `shouldComponentUpdate` reads
    // `nextState.quickAdd` and throws if `nextState` isn't its own state object.
    // Updating a prop on Widget (mirroring typing into an unrelated sibling
    // field re-rendering the entry form) must not crash, and the wrapped
    // control's `shouldComponentUpdate` must observe its own next state, not
    // Widget's.
    class WrappedControl extends Component {
      constructor(props) {
        super(props);
        this.state = { quickAdd: false };
      }

      shouldComponentUpdate(nextProps, nextState) {
        // Pre-fix, Widget delegated its own (always-null) nextState here,
        // which threw reading `.quickAdd` off it - exactly like
        // RelationControl.shouldComponentUpdate did in production.
        return nextState.quickAdd !== this.state.quickAdd || nextProps.value !== this.props.value;
      }

      render() {
        return <div data-testid="wrapped">{`${this.props.value}:${this.state.quickAdd}`}</div>;
      }
    }

    it("uses the wrapped control's own nextState, not Widget's, when React updates it", () => {
      const scuSpy = jest.spyOn(WrappedControl.prototype, 'shouldComponentUpdate');

      const field = fromJS({ name: 'title' });
      const baseProps = {
        field,
        controlComponent: WrappedControl,
        classNameWrapper: '',
        classNameWidget: '',
        classNameWidgetActive: '',
        classNameLabel: '',
        classNameLabelActive: '',
        mediaPaths: fromJS({}),
        entry: fromJS({}),
        widget: {},
        resolveWidget: () => {},
        getEditorComponents: () => {},
        query: () => {},
        clearSearch: () => {},
        clearFieldErrors: () => {},
        editorControl: 'div',
        uniqueFieldId: 'title-field',
        loadEntry: () => {},
        t: key => key,
        onChange: () => {},
        onOpenMediaLibrary: () => {},
        onClearMediaControl: () => {},
        onRemoveMediaControl: () => {},
        onPersistMedia: () => {},
        onAddAsset: () => {},
        onRemoveInsertedMedia: () => {},
        getAsset: () => {},
        setActiveStyle: () => {},
        setInactiveStyle: () => {},
      };

      const { rerender } = render(<Widget {...baseProps} value="a" />);

      scuSpy.mockClear();

      // Mirrors the repro: an unrelated sibling field's edit re-renders the
      // entry form, changing this Widget's `value` prop while the wrapped
      // control's own state (`quickAdd`) is untouched.
      expect(() => {
        act(() => {
          rerender(<Widget {...baseProps} value="b" />);
        });
      }).not.toThrow();

      expect(scuSpy).toHaveBeenCalledTimes(1);
      const [nextProps, nextState] = scuSpy.mock.calls[0];
      expect(nextProps.value).toBe('b');
      // The wrapped control's own next state, not Widget's (which is always
      // `null` - Widget never calls setState).
      expect(nextState).toEqual({ quickAdd: false });

      scuSpy.mockRestore();
    });
  });

  describe('hasErrors/errorListId threading (DCMS-1743)', () => {
    // EditorControl computes `hasErrors`/`errorListId` and hands them to
    // Widget as props; Widget's only job here is to forward them unchanged
    // to `controlComponent` (alongside `field`, from which each leaf control
    // derives its own `aria-required`) so the real widgets (StringControl,
    // NumberControl, ...) can set aria-invalid/aria-required/aria-errormessage.
    function LeafControl(props) {
      return (
        <div
          data-testid="leaf"
          data-has-errors={String(!!props.hasErrors)}
          data-error-list-id={props.errorListId || ''}
        />
      );
    }

    const baseProps = {
      field: fromJS({ name: 'title', required: true }),
      controlComponent: LeafControl,
      classNameWrapper: '',
      classNameWidget: '',
      classNameWidgetActive: '',
      classNameLabel: '',
      classNameLabelActive: '',
      mediaPaths: fromJS({}),
      entry: fromJS({}),
      widget: {},
      resolveWidget: () => {},
      getEditorComponents: () => {},
      query: () => {},
      clearSearch: () => {},
      clearFieldErrors: () => {},
      editorControl: 'div',
      uniqueFieldId: 'title-field',
      loadEntry: () => {},
      t: key => key,
      onChange: () => {},
      onOpenMediaLibrary: () => {},
      onClearMediaControl: () => {},
      onRemoveMediaControl: () => {},
      onPersistMedia: () => {},
      onAddAsset: () => {},
      onRemoveInsertedMedia: () => {},
      getAsset: () => {},
      setActiveStyle: () => {},
      setInactiveStyle: () => {},
    };

    it('forwards hasErrors=false/no errorListId through to the leaf control before save', () => {
      render(<Widget {...baseProps} value="" hasErrors={false} />);

      const leaf = screen.getByTestId('leaf');
      expect(leaf.dataset.hasErrors).toBe('false');
      expect(leaf.dataset.errorListId).toBe('');
    });

    it('forwards hasErrors=true and the errorListId through to the leaf control on failed save', () => {
      render(<Widget {...baseProps} value="" hasErrors={true} errorListId="title-field-errors" />);

      const leaf = screen.getByTestId('leaf');
      expect(leaf.dataset.hasErrors).toBe('true');
      expect(leaf.dataset.errorListId).toBe('title-field-errors');
    });

    it('re-renders the leaf control when only hasErrors/errorListId change', () => {
      const { rerender } = render(<Widget {...baseProps} value="" hasErrors={false} />);
      expect(screen.getByTestId('leaf').dataset.hasErrors).toBe('false');

      rerender(
        <Widget {...baseProps} value="" hasErrors={true} errorListId="title-field-errors" />,
      );
      expect(screen.getByTestId('leaf').dataset.hasErrors).toBe('true');
      expect(screen.getByTestId('leaf').dataset.errorListId).toBe('title-field-errors');
    });
  });

  describe('validate (DCMS-458 Standard Schema field validation)', () => {
    // zod is the reference implementation of the Standard Schema protocol
    // (https://github.com/standard-schema/standard-schema); this test proves
    // any conformant library round-trips through `field.validate` without
    // decap-cms-core depending on zod at runtime - it only ever calls
    // `schema['~standard'].validate(value)`.
    const schema = z.string().min(3, { message: 'Must be at least 3 characters' });

    it('surfaces the schema issues as the field error when the value is invalid', () => {
      const field = fromJS({ name: 'title', validate: schema });
      const onValidate = jest.fn();
      const widget = createWidget({ field, value: 'ab', onValidate });

      widget.validate();

      expect(onValidate).toHaveBeenCalledTimes(1);
      const errors = onValidate.mock.calls[0][0];
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(ValidationErrorTypes.CUSTOM);
      expect(errors[0].message).toBe('Must be at least 3 characters');
    });

    it('clears the field error when the value satisfies the schema', () => {
      const field = fromJS({ name: 'title', validate: schema });
      const onValidate = jest.fn();
      const widget = createWidget({ field, value: 'hello', onValidate });

      widget.validate();

      expect(onValidate).toHaveBeenCalledWith([]);
    });

    it('does not run the built-in required/pattern checks when validate is set', () => {
      // Without `validate`, an empty required field would fail `validatePresence`.
      // With `validate` set, that DSL is bypassed entirely in favor of the schema.
      const field = fromJS({ name: 'title', required: true, validate: z.string() });
      const onValidate = jest.fn();
      const widget = createWidget({ field, value: '', onValidate });

      widget.validate();

      expect(onValidate).toHaveBeenCalledWith([]);
    });

    it('leaves fields without a validate schema on the existing widget validation DSL', () => {
      const field = fromJS({ name: 'title', required: true });
      const onValidate = jest.fn();
      const widget = createWidget({ field, value: '', onValidate });
      widget.wrappedControlValid = () => true;

      widget.validate();

      const errors = onValidate.mock.calls[0][0];
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(ValidationErrorTypes.PRESENCE);
    });
  });
});
