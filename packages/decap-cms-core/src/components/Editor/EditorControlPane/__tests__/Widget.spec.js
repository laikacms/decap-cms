import { fromJS, List } from 'immutable';

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
});
