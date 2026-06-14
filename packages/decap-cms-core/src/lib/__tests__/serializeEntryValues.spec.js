import { fromJS, Map, List } from 'immutable';

import { serializeValues, deserializeValues } from '../serializeEntryValues';
import { registerWidgetValueSerializer } from '../registry';

const values = fromJS({ title: 'New Post', unknown: 'Unknown Field' });
const fields = fromJS([{ name: 'title', widget: 'string' }]);

describe('serializeValues', () => {
  it('should retain unknown fields', () => {
    expect(serializeValues(values, fields)).toEqual(
      fromJS({ title: 'New Post', unknown: 'Unknown Field' }),
    );
  });

  it('applies serializer.serialize on a flat field with a registered serializer', () => {
    registerWidgetValueSerializer('mock-widget', {
      serialize: v => `serialized:${v}`,
      deserialize: v => v.replace('serialized:', ''),
    });

    const testValues = fromJS({ body: 'hello' });
    const testFields = fromJS([{ name: 'body', widget: 'mock-widget' }]);

    const result = serializeValues(testValues, testFields);
    expect(result.get('body')).toBe('serialized:hello');
  });

  it('recurses into an object field (Map value) and serializes nested field values', () => {
    registerWidgetValueSerializer('inner-widget', {
      serialize: v => `obj-serialized:${v}`,
      deserialize: v => v.replace('obj-serialized:', ''),
    });

    const testValues = fromJS({
      meta: {
        subtitle: 'world',
      },
    });
    const testFields = fromJS([
      {
        name: 'meta',
        widget: 'object',
        fields: [{ name: 'subtitle', widget: 'inner-widget' }],
      },
    ]);

    const result = serializeValues(testValues, testFields);
    expect(result.getIn(['meta', 'subtitle'])).toBe('obj-serialized:world');
  });

  it('recurses into a list field (List value) and serializes nested field values for each item', () => {
    registerWidgetValueSerializer('list-inner-widget', {
      serialize: v => `list-serialized:${v}`,
      deserialize: v => v.replace('list-serialized:', ''),
    });

    const testValues = Map({
      items: List([Map({ label: 'first' }), Map({ label: 'second' })]),
    });
    const testFields = fromJS([
      {
        name: 'items',
        widget: 'list',
        fields: [{ name: 'label', widget: 'list-inner-widget' }],
      },
    ]);

    const result = serializeValues(testValues, testFields);
    expect(result.getIn(['items', 0, 'label'])).toBe('list-serialized:first');
    expect(result.getIn(['items', 1, 'label'])).toBe('list-serialized:second');
  });

  it('does not call serializer when value is undefined', () => {
    const serialize = jest.fn();
    registerWidgetValueSerializer('nil-widget-undef', {
      serialize,
      deserialize: jest.fn(),
    });

    const testValues = fromJS({});
    const testFields = fromJS([{ name: 'missing', widget: 'nil-widget-undef' }]);

    serializeValues(testValues, testFields);
    expect(serialize).not.toHaveBeenCalled();
  });

  it('does not call serializer when value is null', () => {
    const serialize = jest.fn();
    registerWidgetValueSerializer('nil-widget-null', {
      serialize,
      deserialize: jest.fn(),
    });

    const testValues = Map({ nullField: null });
    const testFields = fromJS([{ name: 'nullField', widget: 'nil-widget-null' }]);

    serializeValues(testValues, testFields);
    expect(serialize).not.toHaveBeenCalled();
  });
});

describe('deserializeValues', () => {
  it('should retain unknown fields', () => {
    expect(deserializeValues(values, fields)).toEqual(
      fromJS({ title: 'New Post', unknown: 'Unknown Field' }),
    );
  });

  it('applies serializer.deserialize on a flat field with a registered serializer', () => {
    registerWidgetValueSerializer('mock-deser-widget', {
      serialize: v => `serialized:${v}`,
      deserialize: v => `deserialized:${v}`,
    });

    const testValues = fromJS({ body: 'raw' });
    const testFields = fromJS([{ name: 'body', widget: 'mock-deser-widget' }]);

    const result = deserializeValues(testValues, testFields);
    expect(result.get('body')).toBe('deserialized:raw');
  });
});
