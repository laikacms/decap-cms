import { fromJS } from 'immutable';

import {
  DEFAULT_TYPE_KEY,
  TYPE_KEY,
  TYPES_KEY,
  getErrorMessageForTypedFieldAndValue,
  getTypedFieldForValue,
  pluralize,
  resolveFunctionForTypedField,
  resolveFieldKeyType,
} from '../typedListHelpers';

const typeADef = fromJS({ name: 'typeA', fields: [{ name: 'title', widget: 'string' }] });
const typeBDef = fromJS({ name: 'typeB', fields: [{ name: 'body', widget: 'text' }] });

function makeField(extraKeys = {}) {
  return fromJS({ [TYPES_KEY]: [typeADef.toJS(), typeBDef.toJS()], ...extraKeys });
}

describe('resolveFieldKeyType', () => {
  it('returns DEFAULT_TYPE_KEY ("type") when typeKey is not set', () => {
    const field = makeField();
    expect(resolveFieldKeyType(field)).toBe(DEFAULT_TYPE_KEY);
  });

  it('returns the custom typeKey when set', () => {
    const field = makeField({ [TYPE_KEY]: 'kind' });
    expect(resolveFieldKeyType(field)).toBe('kind');
  });
});

describe('getTypedFieldForValue', () => {
  it('returns the matching type definition using the default type key', () => {
    const field = makeField();
    const value = fromJS({ [DEFAULT_TYPE_KEY]: 'typeA', title: 'Hello' });
    const result = getTypedFieldForValue(field, value);
    expect(result).toBeDefined();
    expect(result.get('name')).toBe('typeA');
  });

  it('returns typeB when value matches typeB', () => {
    const field = makeField();
    const value = fromJS({ [DEFAULT_TYPE_KEY]: 'typeB', body: 'World' });
    const result = getTypedFieldForValue(field, value);
    expect(result.get('name')).toBe('typeB');
  });

  it('returns undefined when value type does not match any type', () => {
    const field = makeField();
    const value = fromJS({ [DEFAULT_TYPE_KEY]: 'unknownType' });
    expect(getTypedFieldForValue(field, value)).toBeUndefined();
  });

  it('uses a custom typeKey when set on the field', () => {
    const field = makeField({ [TYPE_KEY]: 'kind' });
    const value = fromJS({ kind: 'typeA', title: 'Hello' });
    const result = getTypedFieldForValue(field, value);
    expect(result.get('name')).toBe('typeA');
  });

  it('returns undefined when custom typeKey key is missing from value', () => {
    const field = makeField({ [TYPE_KEY]: 'kind' });
    const value = fromJS({ [DEFAULT_TYPE_KEY]: 'typeA' }); // has "type", not "kind"
    expect(getTypedFieldForValue(field, value)).toBeUndefined();
  });
});

describe('resolveFunctionForTypedField', () => {
  it('returns a function', () => {
    const field = makeField();
    expect(typeof resolveFunctionForTypedField(field)).toBe('function');
  });

  it('the returned function resolves the correct type using the default key', () => {
    const field = makeField();
    const resolve = resolveFunctionForTypedField(field);
    const value = fromJS({ [DEFAULT_TYPE_KEY]: 'typeB' });
    const result = resolve(value);
    expect(result.get('name')).toBe('typeB');
  });

  it('the returned function resolves the correct type using a custom typeKey', () => {
    const field = makeField({ [TYPE_KEY]: 'kind' });
    const resolve = resolveFunctionForTypedField(field);
    const valueA = fromJS({ kind: 'typeA' });
    const valueB = fromJS({ kind: 'typeB' });
    expect(resolve(valueA).get('name')).toBe('typeA');
    expect(resolve(valueB).get('name')).toBe('typeB');
  });

  it('the returned function returns undefined for an unknown type', () => {
    const field = makeField();
    const resolve = resolveFunctionForTypedField(field);
    expect(resolve(fromJS({ [DEFAULT_TYPE_KEY]: 'nope' }))).toBeUndefined();
  });
});

describe('pluralize', () => {
  it('returns falsy input as-is', () => {
    expect(pluralize('')).toBe('');
    expect(pluralize(undefined)).toBeUndefined();
  });

  it('appends "s" for regular nouns', () => {
    expect(pluralize('list')).toBe('lists');
    expect(pluralize('item')).toBe('items');
    expect(pluralize('author')).toBe('authors');
    expect(pluralize('tag')).toBe('tags');
    expect(pluralize('photo')).toBe('photos');
  });

  it('appends "es" for nouns ending in s/x/z/ch/sh', () => {
    expect(pluralize('box')).toBe('boxes');
    expect(pluralize('bus')).toBe('buses');
    expect(pluralize('buzz')).toBe('buzzes');
    expect(pluralize('match')).toBe('matches');
    expect(pluralize('dish')).toBe('dishes');
  });

  it('replaces trailing consonant+y with "ies"', () => {
    expect(pluralize('category')).toBe('categories');
    expect(pluralize('story')).toBe('stories');
  });

  it('does not apply the consonant+y rule after a vowel', () => {
    expect(pluralize('day')).toBe('days');
    expect(pluralize('toy')).toBe('toys');
  });
});

describe('getErrorMessageForTypedFieldAndValue', () => {
  describe('with default typeKey', () => {
    it('returns "no property" error when the type key is absent from value', () => {
      const field = makeField();
      const value = fromJS({ title: 'Hello' }); // no "type" key
      const msg = getErrorMessageForTypedFieldAndValue(field, value);
      expect(msg).toBe(`Error: item has no '${DEFAULT_TYPE_KEY}' property`);
    });

    it('returns "illegal property" error when the type key has an unrecognised value', () => {
      const field = makeField();
      const value = fromJS({ [DEFAULT_TYPE_KEY]: 'badType' });
      const msg = getErrorMessageForTypedFieldAndValue(field, value);
      expect(msg).toBe(`Error: item has illegal '${DEFAULT_TYPE_KEY}' property: 'badType'`);
    });
  });

  describe('with custom typeKey', () => {
    it('returns "no property" error mentioning the custom key when absent', () => {
      const field = makeField({ [TYPE_KEY]: 'kind' });
      const value = fromJS({ title: 'Hello' }); // no "kind" key
      const msg = getErrorMessageForTypedFieldAndValue(field, value);
      expect(msg).toBe("Error: item has no 'kind' property");
    });

    it('returns "illegal property" error mentioning the custom key and value', () => {
      const field = makeField({ [TYPE_KEY]: 'kind' });
      const value = fromJS({ kind: 'badKind' });
      const msg = getErrorMessageForTypedFieldAndValue(field, value);
      expect(msg).toBe("Error: item has illegal 'kind' property: 'badKind'");
    });
  });
});
