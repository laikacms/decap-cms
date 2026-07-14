import { getChangedProps, valueToOption, slugifyLabel } from '../helpers';

describe('getChangedProps', () => {
  it('returns undefined when no props changed', () => {
    const obj = { a: 1, b: 'hello' };
    expect(getChangedProps(obj, { ...obj })).toBeUndefined();
  });

  it('returns only the changed props when props differ', () => {
    const previous = { a: 1, b: 2 };
    const next = { a: 1, b: 99 };
    expect(getChangedProps(previous, next)).toEqual({ b: 99 });
  });

  it('respects an explicit keys filter', () => {
    const previous = { a: 1, b: 2, c: 3 };
    const next = { a: 10, b: 20, c: 3 };
    expect(getChangedProps(previous, next, ['b'])).toEqual({ b: 20 });
  });

  it('returns undefined when watched keys have not changed', () => {
    const previous = { a: 1, b: 2 };
    const next = { a: 99, b: 2 };
    expect(getChangedProps(previous, next, ['b'])).toBeUndefined();
  });
});

describe('valueToOption', () => {
  it('returns {value, label} for a string', () => {
    expect(valueToOption('javascript')).toEqual({ value: 'javascript', label: 'javascript' });
  });

  it('returns {value: val.name, label: val.label} for an object with label', () => {
    expect(valueToOption({ name: 'js', label: 'JavaScript' })).toEqual({
      value: 'js',
      label: 'JavaScript',
    });
  });

  it('falls back to val.name as label when val.label is absent', () => {
    expect(valueToOption({ name: 'ts' })).toEqual({ value: 'ts', label: 'ts' });
  });
});

describe('slugifyLabel', () => {
  it('lowercases and hyphenates a multi-word label', () => {
    expect(slugifyLabel('Ant Build System')).toBe('ant-build-system');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugifyLabel('JSON5')).toBe('json5');
    expect(slugifyLabel('JavaScript+ERB')).toBe('javascript-erb');
  });

  it('produces distinct values for distinct labels (DCMS-485)', () => {
    const labels = [
      'Ant Build System',
      'Cloud Firestore Security Rules',
      'JSON5',
      'JavaScript+ERB',
      'Maven POM',
    ];
    const slugs = labels.map(slugifyLabel);
    expect(new Set(slugs).size).toBe(labels.length);
    expect(slugs).not.toContain(undefined);
  });
});
