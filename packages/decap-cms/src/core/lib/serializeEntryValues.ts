import { isNil } from 'lodash-es';

import { getWidgetValueSerializer } from './registry';

type SerializerMethod = 'serialize' | 'deserialize';

type FieldMap = Record<string, any>;

type FieldList = FieldMap[];

type ValuesMap = Record<string, any>;

/**
 * Methods for serializing/deserializing entry field values. Most widgets don't
 * require this for their values, and those that do can typically serialize/
 * deserialize on every change from within the widget. The serialization
 * handlers here are for widgets whose values require heavy serialization that
 * would hurt performance if run for every change.

 * An example of this is the richtext widget, whose value is stored as a
 * markdown string. Instead of stringifying on every change of that field, a
 * deserialization method is registered from the widget's control module that
 * converts the stored markdown string to an AST, and that AST serves as the
 * widget model during editing.
 *
 * Serialization handlers should be registered for each widget that requires
 * them, and the registration method is exposed through the registry. Any
 * registered deserialization handlers run on entry load, and serialization
 * handlers run on persist.
 */
function runSerializer(values: ValuesMap, fields: FieldList, method: SerializerMethod): ValuesMap {
  /**
   * Reduce the list of fields to a map where keys are field names and values
   * are field values, serializing the values of fields whose widgets have
   * registered serializers.  If the field is a list or object, call recursively
   * for nested fields.
   */
  let serializedData = fields.reduce((acc: ValuesMap, field: FieldMap) => {
    const fieldName = field['name'] as string;
    const value = values[fieldName];
    const serializer = getWidgetValueSerializer(field['widget'] as string);
    const nestedFields = field['fields'] as FieldList | undefined;

    // Call recursively for fields within lists
    if (nestedFields && Array.isArray(value)) {
      return {
        ...acc,

        [fieldName]: value.map((val: ValuesMap) => runSerializer(val, nestedFields, method)),
      };
    }

    // Call recursively for fields within objects
    if (nestedFields && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { ...acc, [fieldName]: runSerializer(value as ValuesMap, nestedFields, method) };
    }

    // Run serialization method on value if not null or undefined
    if (serializer && !isNil(value)) {
      const typedSerializer = serializer as {
        serialize: (value: unknown) => unknown,
        deserialize: (value: unknown) => unknown,
      };
      return { ...acc, [fieldName]: typedSerializer[method](value) };
    }

    // If no serializer is registered for the field's widget, use the field as is
    if (!isNil(value)) {
      return { ...acc, [fieldName]: value };
    }

    return acc;
  }, {} as ValuesMap);

  // preserve unknown fields value
  serializedData = { ...values, ...serializedData };

  return serializedData;
}

export function serializeValues(values: ValuesMap, fields: FieldList): ValuesMap {
  return runSerializer(values, fields, 'serialize');
}

export function deserializeValues(values: ValuesMap, fields: FieldList): ValuesMap {
  return runSerializer(values, fields, 'deserialize');
}
