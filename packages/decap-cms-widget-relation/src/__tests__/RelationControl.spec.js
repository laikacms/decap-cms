import { fromJS, List, Map } from 'immutable';

import {
  arrayMove,
  convertToOption,
  convertToSortableOption,
  getFieldArray,
  getSelectedOptions,
  getSelectedValue,
  normalizeField,
  optionToString,
  uniqOptions,
} from '../RelationControl';

jest.mock('uuid');

describe('normalizeField', () => {
  it('coalesces camelCase keys into their snake_case equivalents', () => {
    const field = fromJS({
      valueField: 'title',
      searchFields: ['title', 'body'],
      displayFields: ['title'],
      optionsLength: 10,
    });

    const normalized = normalizeField(field);

    expect(normalized.get('value_field')).toBe('title');
    expect(normalized.get('search_fields').toJS()).toEqual(['title', 'body']);
    expect(normalized.get('display_fields').toJS()).toEqual(['title']);
    expect(normalized.get('options_length')).toBe(10);
  });

  it('prefers an already-present snake_case key over the camelCase one', () => {
    const field = fromJS({
      value_field: 'slug',
      valueField: 'title',
    });

    const normalized = normalizeField(field);

    expect(normalized.get('value_field')).toBe('slug');
  });

  it('leaves the field unchanged when neither form is present', () => {
    const field = fromJS({ name: 'post' });

    const normalized = normalizeField(field);

    expect(normalized.get('value_field')).toBeUndefined();
    expect(normalized.get('search_fields')).toBeUndefined();
    expect(normalized.get('display_fields')).toBeUndefined();
    expect(normalized.get('options_length')).toBeUndefined();
  });
});

describe('arrayMove', () => {
  it('moves an item from one index to another', () => {
    expect(arrayMove(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item earlier in the array', () => {
    expect(arrayMove(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('resolves a negative "to" index relative to the end of the array', () => {
    // to = -1 means "last position", equivalent to array.length - 1
    expect(arrayMove(['a', 'b', 'c'], 0, -1)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the original array', () => {
    const original = ['a', 'b', 'c'];
    arrayMove(original, 0, 2);
    expect(original).toEqual(['a', 'b', 'c']);
  });
});

describe('optionToString', () => {
  it('returns the value of a truthy option', () => {
    expect(optionToString({ value: 'title', label: 'Title' })).toBe('title');
  });

  it('returns an empty string when the option is null', () => {
    expect(optionToString(null)).toBe('');
  });

  it('returns an empty string when the option has no value', () => {
    expect(optionToString({ value: '' })).toBe('');
    expect(optionToString({})).toBe('');
  });
});

describe('convertToOption', () => {
  it('wraps a string into a label/value pair', () => {
    expect(convertToOption('title')).toEqual({ label: 'title', value: 'title' });
  });

  it('converts an Immutable Map to a plain object', () => {
    const raw = Map({ value: 'title', label: 'Title', data: { id: 1 } });

    expect(convertToOption(raw)).toEqual({ value: 'title', label: 'Title', data: { id: 1 } });
  });

  it('passes plain objects through unchanged', () => {
    const raw = { value: 'title', label: 'Title' };

    expect(convertToOption(raw)).toBe(raw);
  });
});

describe('getSelectedOptions', () => {
  it('converts an Immutable List to a plain array', () => {
    expect(getSelectedOptions(List(['a', 'b']))).toEqual(['a', 'b']);
  });

  it('passes a plain array through unchanged', () => {
    expect(getSelectedOptions(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('returns null for null input', () => {
    expect(getSelectedOptions(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getSelectedOptions(undefined)).toBeNull();
  });

  it('returns null for a non-array, non-list value (e.g. a single string)', () => {
    expect(getSelectedOptions('title')).toBeNull();
  });
});

describe('getFieldArray', () => {
  it('converts an Immutable List to a plain array', () => {
    expect(getFieldArray(List(['title', 'body']))).toEqual(['title', 'body']);
  });

  it('wraps a single non-list field into a one-item array', () => {
    expect(getFieldArray('title')).toEqual(['title']);
  });

  it('returns an empty array for null', () => {
    expect(getFieldArray(null)).toEqual([]);
  });

  it('returns an empty array for undefined', () => {
    expect(getFieldArray(undefined)).toEqual([]);
  });
});

describe('uniqOptions', () => {
  it('deduplicates options from both arrays by value', () => {
    const initial = [{ value: 'a', label: 'A' }];
    const current = [
      { value: 'a', label: 'A (from search)' },
      { value: 'b', label: 'B' },
    ];

    expect(uniqOptions(initial, current)).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
  });

  it('returns all options when there are no duplicates', () => {
    const initial = [{ value: 'a', label: 'A' }];
    const current = [{ value: 'b', label: 'B' }];

    expect(uniqOptions(initial, current)).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
  });

  it('handles empty inputs', () => {
    expect(uniqOptions([], [])).toEqual([]);
  });
});

describe('getSelectedValue', () => {
  const options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    const uuid = require('uuid');
    let id = 0;
    uuid.v4.mockImplementation(() => `uuid-${id++}`);
  });

  describe('when isMultiple is false', () => {
    it('finds the single matching option by value', () => {
      const selected = getSelectedValue({ value: 'b', options, isMultiple: false });

      expect(selected).toEqual({ value: 'b', label: 'B' });
    });

    it('returns null when no option matches', () => {
      const selected = getSelectedValue({ value: 'missing', options, isMultiple: false });

      expect(selected).toBeNull();
    });
  });

  describe('when isMultiple is true', () => {
    it('resolves each selected value to its option and tags it with an id', () => {
      const selected = getSelectedValue({
        value: List(['b', 'a']),
        options,
        isMultiple: true,
      });

      expect(selected).toEqual([
        { value: 'b', label: 'B', data: { id: 'uuid-0' } },
        { value: 'a', label: 'A', data: { id: 'uuid-1' } },
      ]);
    });

    it('filters out values that have no matching option', () => {
      const selected = getSelectedValue({
        value: List(['missing', 'a']),
        options,
        isMultiple: true,
      });

      expect(selected).toEqual([{ value: 'a', label: 'A', data: { id: 'uuid-0' } }]);
    });

    it('returns null early when the value cannot be resolved to a selection list', () => {
      const selected = getSelectedValue({ value: null, options, isMultiple: true });

      expect(selected).toBeNull();
    });
  });
});

describe('convertToSortableOption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const uuid = require('uuid');
    uuid.v4.mockImplementation(() => 'generated-id');
  });

  it('wraps a converted option with a generated id in its data', () => {
    const sortable = convertToSortableOption({ value: 'a', label: 'A' });

    expect(sortable).toEqual({ value: 'a', label: 'A', data: { id: 'generated-id' } });
  });

  it('preserves existing data fields alongside the generated id', () => {
    const sortable = convertToSortableOption({ value: 'a', label: 'A', data: { title: 'A' } });

    expect(sortable).toEqual({
      value: 'a',
      label: 'A',
      data: { title: 'A', id: 'generated-id' },
    });
  });

  it('converts an Immutable Map input before tagging it with an id', () => {
    const sortable = convertToSortableOption(Map({ value: 'a', label: 'A' }));

    expect(sortable).toEqual({ value: 'a', label: 'A', data: { id: 'generated-id' } });
  });
});
