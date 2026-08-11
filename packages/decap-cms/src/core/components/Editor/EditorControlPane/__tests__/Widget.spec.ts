import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import Widget, { isEmpty } from '@/core/components/Editor/EditorControlPane/Widget';
import ValidationErrorTypes from '@/core/constants/validationErrorTypes';

function createWidget(props: Record<string, unknown>) {
  return new Widget(
    {
      t: (key: string, options: { pattern?: string } = {}) => `${key}${options.pattern ? `:${options.pattern}` : ''}`,
      parentIds: [],
      ...props,
    } as ConstructorParameters<typeof Widget>[0],
  );
}

/**
 * Regression test for DCMS-449: a whitespace-only string (e.g. "   ") has a
 * positive `.length`, so the required-field guard's raw `.length === 0`
 * check let it slip through as "not empty". That allowed Save to enable and
 * the entry to be silently discarded (never persisted, no error shown).
 */
describe('Widget isEmpty (DCMS-449)', () => {
  it('treats an empty string as empty', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('treats a whitespace-only string as empty', () => {
    expect(isEmpty('   ')).toBe(true);
  });

  it('treats a string of only tabs/newlines as empty', () => {
    expect(isEmpty('\t\n')).toBe(true);
  });

  it('treats a non-empty string as not empty', () => {
    expect(isEmpty('hello')).toBe(false);
  });

  it('treats a string with surrounding whitespace but real content as not empty', () => {
    expect(isEmpty('  hello  ')).toBe(false);
  });

  it('treats null as empty', () => {
    expect(isEmpty(null)).toBe(true);
  });

  it('treats undefined as empty', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('treats an empty array as empty', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('treats a non-empty array as not empty', () => {
    expect(isEmpty([1, 2, 3])).toBe(false);
  });

  it('treats an empty plain object as empty', () => {
    expect(isEmpty({})).toBe(true);
  });

  it('treats a non-empty plain object as not empty', () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it('treats a value with a zero .length property as empty', () => {
    expect(isEmpty({ length: 0 })).toBe(true);
  });

  it('treats a value with a positive .length property as not empty', () => {
    expect(isEmpty({ length: 3 })).toBe(false);
  });
});

describe('Widget validate (DCMS-458 Standard Schema field validation)', () => {
  // zod is the reference implementation of the Standard Schema protocol
  // (https://github.com/standard-schema/standard-schema); this test proves
  // any conformant library round-trips through `field.validate` without
  // decap-cms depending on zod at runtime - it only ever calls
  // `schema['~standard'].validate(value)`.
  const schema = z.string().min(3, { message: 'Must be at least 3 characters' });

  it('surfaces the schema issues as the field error when the value is invalid', () => {
    const field = { name: 'title', validate: schema };
    const onValidate = vi.fn();
    const widget = createWidget({ field, value: 'ab', onValidate });

    widget.validate();

    expect(onValidate).toHaveBeenCalledTimes(1);
    const errors = onValidate.mock.calls[0][0];
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe(ValidationErrorTypes.CUSTOM);
    expect(errors[0].message).toBe('Must be at least 3 characters');
  });

  it('clears the field error when the value satisfies the schema', () => {
    const field = { name: 'title', validate: schema };
    const onValidate = vi.fn();
    const widget = createWidget({ field, value: 'hello', onValidate });

    widget.validate();

    expect(onValidate).toHaveBeenCalledWith([]);
  });

  it('does not run the built-in required/pattern checks when validate is set', () => {
    // Without `validate`, an empty required field would fail `validatePresence`.
    // With `validate` set, that DSL is bypassed entirely in favor of the schema.
    const field = { name: 'title', required: true, validate: z.string() };
    const onValidate = vi.fn();
    const widget = createWidget({ field, value: '', onValidate });

    widget.validate();

    expect(onValidate).toHaveBeenCalledWith([]);
  });

  it('leaves fields without a validate schema on the existing widget validation DSL', () => {
    const field = { name: 'title', required: true };
    const onValidate = vi.fn();
    const widget = createWidget({ field, value: '', onValidate });
    widget.wrappedControlValid = () => true;

    widget.validate();

    const errors = onValidate.mock.calls[0][0];
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe(ValidationErrorTypes.PRESENCE);
  });

  it('surfaces an async Standard Schema validator resolution as the field error', async () => {
    const asyncSchema: z.ZodType<string> = z.string().refine(
      async value => value.length >= 3,
      { message: 'Must be at least 3 characters (async)' },
    );
    const field = { name: 'title', validate: asyncSchema };
    const onValidate = vi.fn();
    const widget = createWidget({ field, value: 'ab', onValidate });

    widget.validate();

    // First call is the transient "processing" error while the promise is pending.
    expect(onValidate).toHaveBeenCalledTimes(1);
    expect(onValidate.mock.calls[0][0][0].type).toBe(ValidationErrorTypes.CUSTOM);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onValidate).toHaveBeenCalledTimes(2);
    const errors = onValidate.mock.calls[1][0];
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Must be at least 3 characters (async)');
  });
});
