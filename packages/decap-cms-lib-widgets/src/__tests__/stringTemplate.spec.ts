import {
  addFileTemplateFields,
  compileStringTemplate,
  dateParsers,
  expandPath,
  extractTemplateVars,
  keyToPathArray,
  parseDateFromEntry,
  parseDateFromEntryData,
  SLUG_MISSING_REQUIRED_DATE,
} from '../stringTemplate';

describe('dateParsers', () => {
  const date = new Date(2024, 0, 5, 6, 7, 8); // 2024-01-05 06:07:08

  it('formats each date part zero-padded', () => {
    expect(dateParsers.year(date)).toBe('2024');
    expect(dateParsers.month(date)).toBe('01');
    expect(dateParsers.day(date)).toBe('05');
    expect(dateParsers.hour(date)).toBe('06');
    expect(dateParsers.minute(date)).toBe('07');
    expect(dateParsers.second(date)).toBe('08');
  });
});

describe('keyToPathArray', () => {
  it('returns an empty array for an undefined key', () => {
    expect(keyToPathArray(undefined)).toEqual([]);
  });

  it('returns an empty array for an empty key', () => {
    expect(keyToPathArray('')).toEqual([]);
  });

  it('splits a dotted key path into segments', () => {
    expect(keyToPathArray('a.b.c')).toEqual(['a', 'b', 'c']);
  });

  it('splits an array-index segment into its own path element', () => {
    expect(keyToPathArray('a[0].b')).toEqual(['a', '0', 'b']);
  });

  it('handles multiple array-index segments', () => {
    expect(keyToPathArray('list[2][3]')).toEqual(['list', '2', '3']);
  });
});

describe('expandPath', () => {
  it('returns the path unchanged when it has no wildcard segments', () => {
    expect(expandPath({ data: { a: 1 }, path: 'a.b' })).toEqual(['a.b']);
  });

  it('expands a single wildcard segment over an array', () => {
    const data = { tags: ['a', 'b', 'c'] };
    expect(expandPath({ data, path: 'tags.*' })).toEqual(['tags.0', 'tags.1', 'tags.2']);
  });

  it('expands nested wildcard segments with array-index paths', () => {
    const data = {
      sections: [{ items: [{ title: 'A' }, { title: 'B' }] }, { items: [{ title: 'C' }] }],
    };
    expect(expandPath({ data, path: 'sections.*.items.*.title' })).toEqual([
      'sections.0.items.0.title',
      'sections.0.items.1.title',
      'sections.1.items.0.title',
    ]);
  });

  it('returns no paths when the wildcarded value is not an array', () => {
    const data = { tags: 'not-an-array' };
    expect(expandPath({ data, path: 'tags.*' })).toEqual([]);
  });
});

describe('extractTemplateVars', () => {
  it('extracts a single variable', () => {
    expect(extractTemplateVars('{{year}}')).toEqual(['year']);
  });

  it('extracts multiple variables', () => {
    expect(extractTemplateVars('{{year}}-{{month}}-{{day}}')).toEqual(['year', 'month', 'day']);
  });

  it('ignores filters when extracting the variable name', () => {
    expect(extractTemplateVars('{{title | upper}}-{{year}}')).toEqual(['title', 'year']);
  });

  it('returns an empty array when there are no template vars', () => {
    expect(extractTemplateVars('plain text, no placeholders')).toEqual([]);
  });
});

describe('compileStringTemplate', () => {
  it('replaces date tokens using the supplied date', () => {
    const date = new Date(2024, 0, 5); // 2024-01-05
    const result = compileStringTemplate('{{year}}-{{month}}-{{day}}', date);
    expect(result).toBe('2024-01-05');
  });

  it('replaces {{slug}} with the provided identifier', () => {
    const result = compileStringTemplate('posts/{{slug}}', undefined, 'my-first-post');
    expect(result).toBe('posts/my-first-post');
  });

  it('replaces field placeholders and applies the lower filter', () => {
    const result = compileStringTemplate('{{title | lower}}', undefined, '', {
      title: 'Hello World',
    });
    expect(result).toBe('hello world');
  });

  it('falls back to the default filter value when the field is missing', () => {
    const result = compileStringTemplate("{{title | default('untitled')}}", undefined, '', {});
    expect(result).toBe('untitled');
  });

  it('substitutes an empty string for a missing field with no filter', () => {
    const result = compileStringTemplate('{{title}}-post', undefined, '', {});
    expect(result).toBe('-post');
  });

  it('allows the fields. prefix to explicitly reference a data field', () => {
    const result = compileStringTemplate('{{fields.category}}', undefined, '', {
      category: 'news',
    });
    expect(result).toBe('news');
  });

  it('turns off date processing and substitutes an empty string when date is explicitly null', () => {
    const result = compileStringTemplate('{{year}}-post', null);
    expect(result).toBe('-post');
  });

  it('throws a SLUG_MISSING_REQUIRED_DATE error when a date token is used without a date', () => {
    expect(() => compileStringTemplate('{{year}}-post', undefined)).toThrow();
    try {
      compileStringTemplate('{{year}}-post', undefined);
      throw new Error('expected compileStringTemplate to throw');
    } catch (err) {
      expect((err as Error).name).toBe(SLUG_MISSING_REQUIRED_DATE);
    }
  });
});

describe('parseDateFromEntryData', () => {
  it('parses a valid date value into a Date', () => {
    const result = parseDateFromEntryData({ date: '2024-01-05' }, 'date');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(0);
    expect(result?.getDate()).toBe(5);
  });

  it('returns undefined when the date field name is not provided', () => {
    expect(parseDateFromEntryData({ date: '2024-01-05' }, undefined)).toBeUndefined();
    expect(parseDateFromEntryData({ date: '2024-01-05' }, null)).toBeUndefined();
  });

  it('returns undefined when the field is missing from the entry data', () => {
    expect(parseDateFromEntryData({}, 'date')).toBeUndefined();
  });

  it('returns undefined when the field value is not a valid date', () => {
    expect(parseDateFromEntryData({ date: 'not-a-date' }, 'date')).toBeUndefined();
  });
});

describe('parseDateFromEntry', () => {
  it('delegates to the entry data for a valid date field', () => {
    const result = parseDateFromEntry({ data: { date: '2024-01-05' } }, 'date');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
  });

  it('returns undefined when the date field name is not provided', () => {
    expect(parseDateFromEntry({ data: { date: '2024-01-05' } }, undefined)).toBeUndefined();
  });

  it('returns undefined when the entry data does not contain the field', () => {
    expect(parseDateFromEntry({ data: {} }, 'date')).toBeUndefined();
  });

  it('feeds a missing required date through to a SLUG_MISSING_REQUIRED_DATE error in compileStringTemplate', () => {
    const missingDate = parseDateFromEntry({ data: {} }, 'date');
    expect(missingDate).toBeUndefined();

    try {
      compileStringTemplate('{{year}}-{{slug}}', missingDate, 'my-post');
      throw new Error('expected compileStringTemplate to throw');
    } catch (err) {
      expect((err as Error).name).toBe(SLUG_MISSING_REQUIRED_DATE);
    }
  });
});

describe('addFileTemplateFields', () => {
  it('returns the fields unchanged when entryPath is empty', () => {
    const fields = { foo: 'bar' };
    expect(addFileTemplateFields('', fields)).toBe(fields);
  });

  it('derives dirname, filename and extension from the entry path', () => {
    const result = addFileTemplateFields('foo/bar/baz.ext', {}, 'foo');
    expect(result).toEqual({
      dirname: 'bar',
      filename: 'baz',
      extension: 'ext',
    });
  });

  it('leaves extension empty when the entry path has no extension', () => {
    const result = addFileTemplateFields('foo/bar/baz', {});
    expect(result.extension).toBe('');
    expect(result.filename).toBe('baz');
  });
});
