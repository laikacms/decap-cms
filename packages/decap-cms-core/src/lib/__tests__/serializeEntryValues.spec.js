import { serializeValues, deserializeValues } from '../serializeEntryValues';
import { registerWidgetValueSerializer } from '../registry';

const values = { title: 'New Post', unknown: 'Unknown Field' };
const fields = [{ name: 'title', widget: 'string' }];

describe('serializeValues', () => {
  it('should retain unknown fields', () => {
    expect(serializeValues(values, fields)).toEqual({
      title: 'New Post',
      unknown: 'Unknown Field',
    });
  });

  it('applies serializer.serialize on a flat field with a registered serializer', () => {
    registerWidgetValueSerializer('mock-widget', {
      serialize: v => `serialized:${v}`,
      deserialize: v => v.replace('serialized:', ''),
    });

    const testValues = { body: 'hello' };
    const testFields = [{ name: 'body', widget: 'mock-widget' }];

    const result = serializeValues(testValues, testFields);
    expect(result.body).toBe('serialized:hello');
  });

  it('recurses into an object field (object value) and serializes nested field values', () => {
    registerWidgetValueSerializer('inner-widget', {
      serialize: v => `obj-serialized:${v}`,
      deserialize: v => v.replace('obj-serialized:', ''),
    });

    const testValues = {
      meta: {
        subtitle: 'world',
      },
    };
    const testFields = [
      {
        name: 'meta',
        widget: 'object',
        fields: [{ name: 'subtitle', widget: 'inner-widget' }],
      },
    ];

    const result = serializeValues(testValues, testFields);
    expect(result.meta.subtitle).toBe('obj-serialized:world');
  });

  it('recurses into a list field (array value) and serializes nested field values for each item', () => {
    registerWidgetValueSerializer('list-inner-widget', {
      serialize: v => `list-serialized:${v}`,
      deserialize: v => v.replace('list-serialized:', ''),
    });

    const testValues = {
      items: [{ label: 'first' }, { label: 'second' }],
    };
    const testFields = [
      {
        name: 'items',
        widget: 'list',
        fields: [{ name: 'label', widget: 'list-inner-widget' }],
      },
    ];

    const result = serializeValues(testValues, testFields);
    expect(result.items[0].label).toBe('list-serialized:first');
    expect(result.items[1].label).toBe('list-serialized:second');
  });

  it('does not call serializer when value is undefined', () => {
    const serialize = jest.fn();
    registerWidgetValueSerializer('nil-widget-undef', {
      serialize,
      deserialize: jest.fn(),
    });

    const testValues = {};
    const testFields = [{ name: 'missing', widget: 'nil-widget-undef' }];

    serializeValues(testValues, testFields);
    expect(serialize).not.toHaveBeenCalled();
  });

  it('does not call serializer when value is null', () => {
    const serialize = jest.fn();
    registerWidgetValueSerializer('nil-widget-null', {
      serialize,
      deserialize: jest.fn(),
    });

    const testValues = { nullField: null };
    const testFields = [{ name: 'nullField', widget: 'nil-widget-null' }];

    serializeValues(testValues, testFields);
    expect(serialize).not.toHaveBeenCalled();
  });
});

describe('deserializeValues', () => {
  it('should retain unknown fields', () => {
    expect(deserializeValues(values, fields)).toEqual({
      title: 'New Post',
      unknown: 'Unknown Field',
    });
  });

  it('applies serializer.deserialize on a flat field with a registered serializer', () => {
    registerWidgetValueSerializer('mock-deser-widget', {
      serialize: v => `serialized:${v}`,
      deserialize: v => `deserialized:${v}`,
    });

    const testValues = { body: 'raw' };
    const testFields = [{ name: 'body', widget: 'mock-deser-widget' }];

    const result = deserializeValues(testValues, testFields);
    expect(result.body).toBe('deserialized:raw');
  });
});
