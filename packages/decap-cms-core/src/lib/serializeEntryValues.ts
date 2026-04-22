import isNil from 'lodash/isNil';
import { Map, List } from 'immutable';
import type { Map as ImmutableMap, List as ImmutableList } from 'immutable';

import { getWidgetValueSerializer } from './registry';

type SerializerMethod = 'serialize' | 'deserialize';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FieldMap = ImmutableMap<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FieldList = ImmutableList<FieldMap>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValuesMap = ImmutableMap<string, any>;

/**
 * Methods for serializing/deserializing entry field values. Most widgets don't
 * require this for their values, and those that do can typically serialize/
 * deserialize on every change from within the widget. The serialization
 * handlers here are for widgets whose values require heavy serialization that
 * would hurt performance if run for every change.

 * An example of this is the markdown widget, whose value is stored as a
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
    const fieldName = field.get('name') as string;
    const value = values.get(fieldName);
    const serializer = getWidgetValueSerializer(field.get('widget') as string);
    const nestedFields = field.get('fields') as FieldList | undefined;

    // Call recursively for fields within lists
    if (nestedFields && List.isList(value)) {
      return acc.set(
        fieldName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value.map((val: any) => runSerializer(val, nestedFields, method)),
      );
    }

    // Call recursively for fields within objects
    if (nestedFields && Map.isMap(value)) {
      return acc.set(fieldName, runSerializer(value as ValuesMap, nestedFields, method));
    }

    // Run serialization method on value if not null or undefined
    if (serializer && !isNil(value)) {
      const typedSerializer = serializer as { serialize: (value: unknown) => unknown; deserialize: (value: unknown) => unknown };
      return acc.set(fieldName, typedSerializer[method](value));
    }

    // If no serializer is registered for the field's widget, use the field as is
    if (!isNil(value)) {
      return acc.set(fieldName, value);
    }

    return acc;
  }, Map() as ValuesMap);

  //preserve unknown fields value
  serializedData = values.mergeDeep(serializedData);

  return serializedData;
}

export function serializeValues(values: ValuesMap, fields: FieldList): ValuesMap {
  return runSerializer(values, fields, 'serialize');
}

export function deserializeValues(values: ValuesMap, fields: FieldList): ValuesMap {
  return runSerializer(values, fields, 'deserialize');
}
