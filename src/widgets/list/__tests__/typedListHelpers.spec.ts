import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TYPE_KEY,
  getErrorMessageForTypedFieldAndValue,
  getTypedFieldForValue,
  resolveFieldKeyType,
  resolveFunctionForTypedField,
} from '@/widgets/list/typedListHelpers';

describe('typedListHelpers', () => {
  const stringType = { name: 'string', label: 'String', widget: 'string' };
  const numberType = { name: 'number', label: 'Number', widget: 'number' };

  describe('getTypedFieldForValue', () => {
    it('resolves the matching typed-field definition for a value using the default type key', () => {
      const field = {
        name: 'list',
        label: 'List',
        widget: 'list',
        types: [stringType, numberType],
      } as any;

      const result = getTypedFieldForValue(field, { type: 'number' });

      expect(result).toEqual(numberType);
    });

    it('resolves the matching typed-field definition using a custom typeKey', () => {
      const field = {
        name: 'list',
        label: 'List',
        widget: 'list',
        typeKey: 'kind',
        types: [stringType, numberType],
      } as any;

      const result = getTypedFieldForValue(field, { kind: 'string' });

      expect(result).toEqual(stringType);
    });

    it('returns undefined when no type in the list matches the value', () => {
      const field = {
        name: 'list',
        label: 'List',
        widget: 'list',
        types: [stringType, numberType],
      } as any;

      const result = getTypedFieldForValue(field, { type: 'unknown' });

      expect(result).toBeUndefined();
    });

    it('returns undefined when the value is not an object (fallback branch)', () => {
      const field = {
        name: 'list',
        label: 'List',
        widget: 'list',
        types: [stringType, numberType],
      } as any;

      expect(getTypedFieldForValue(field, 'not-an-object')).toBeUndefined();
      expect(getTypedFieldForValue(field, 42)).toBeUndefined();
      expect(getTypedFieldForValue(field, undefined)).toBeUndefined();
    });
  });

  describe('resolveFunctionForTypedField', () => {
    it('returns a resolver closure that finds the matching type for a value', () => {
      const field = {
        name: 'list',
        label: 'List',
        widget: 'list',
        types: [stringType, numberType],
      } as any;

      const resolve = resolveFunctionForTypedField(field);

      expect(resolve({ type: 'string' } as any)).toEqual(stringType);
      expect(resolve({ type: 'number' } as any)).toEqual(numberType);
    });

    it('returns a resolver closure that uses a custom typeKey', () => {
      const field = {
        name: 'list',
        label: 'List',
        widget: 'list',
        typeKey: 'kind',
        types: [stringType, numberType],
      } as any;

      const resolve = resolveFunctionForTypedField(field);

      expect(resolve({ kind: 'number' } as any)).toEqual(numberType);
    });

    it('returns a resolver closure that returns undefined when nothing matches', () => {
      const field = {
        name: 'list',
        label: 'List',
        widget: 'list',
        types: [stringType, numberType],
      } as any;

      const resolve = resolveFunctionForTypedField(field);

      expect(resolve({ type: 'unknown' } as any)).toBeUndefined();
    });
  });

  describe('resolveFieldKeyType', () => {
    it('returns the configured typeKey when present', () => {
      const field = { name: 'list', label: 'List', widget: 'list', typeKey: 'kind' } as any;

      expect(resolveFieldKeyType(field)).toBe('kind');
    });

    it('defaults to "type" when typeKey is not configured', () => {
      const field = { name: 'list', label: 'List', widget: 'list' } as any;

      expect(resolveFieldKeyType(field)).toBe(DEFAULT_TYPE_KEY);
      expect(resolveFieldKeyType(field)).toBe('type');
    });
  });

  describe('getErrorMessageForTypedFieldAndValue', () => {
    it('returns a missing-property error message when the value has no type key', () => {
      const field = { name: 'list', label: 'List', widget: 'list' } as any;

      const message = getErrorMessageForTypedFieldAndValue(field, {});

      expect(message).toBe("Error: item has no 'type' property");
    });

    it('returns a missing-property error message using a custom typeKey', () => {
      const field = { name: 'list', label: 'List', widget: 'list', typeKey: 'kind' } as any;

      const message = getErrorMessageForTypedFieldAndValue(field, {});

      expect(message).toBe("Error: item has no 'kind' property");
    });

    it('returns an illegal-property error message when the value has an unrecognized type', () => {
      const field = { name: 'list', label: 'List', widget: 'list' } as any;

      const message = getErrorMessageForTypedFieldAndValue(field, { type: 'bogus' });

      expect(message).toBe("Error: item has illegal 'type' property: 'bogus'");
    });

    it('returns an illegal-property error message using a custom typeKey', () => {
      const field = { name: 'list', label: 'List', widget: 'list', typeKey: 'kind' } as any;

      const message = getErrorMessageForTypedFieldAndValue(field, { kind: 'bogus' });

      expect(message).toBe("Error: item has illegal 'kind' property: 'bogus'");
    });
  });
});
