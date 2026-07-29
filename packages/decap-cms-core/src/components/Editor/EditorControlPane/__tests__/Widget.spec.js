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

  describe('shouldComponentUpdate delegation (DCMS-1689)', () => {
    it('forwards nextState to a wrapped control shouldComponentUpdate that reads it', () => {
      // Regression test: widget-relation's RelationControl.shouldComponentUpdate
      // reads `nextState.quickAdd` (DCMS-1421). Widget.shouldComponentUpdate used
      // to only forward `nextProps`, so `nextState` was `undefined` in the
      // delegated call and `nextState.quickAdd` threw, crashing the app to the
      // top-level error boundary on any props update.
      const field = fromJS({ name: 'title' });
      const widget = createWidget({ field, value: 'a', isLoadingAsset: false });

      const wrappedControlShouldComponentUpdate = jest.fn((nextProps, nextState) => {
        // Would throw here if nextState were undefined, as it did pre-fix.
        return nextState.foo !== 'bar';
      });
      widget.wrappedControlShouldComponentUpdate = wrappedControlShouldComponentUpdate;

      const nextProps = { ...widget.props, value: 'b' };
      const nextState = { foo: 'baz' };

      expect(() => widget.shouldComponentUpdate(nextProps, nextState)).not.toThrow();
      expect(widget.shouldComponentUpdate(nextProps, nextState)).toBe(true);
      expect(wrappedControlShouldComponentUpdate).toHaveBeenCalledWith(
        nextProps,
        nextState,
        undefined,
      );
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
