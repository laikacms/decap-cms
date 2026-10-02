import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  SLUG_MISSING_REQUIRED_DATE,
  addFileTemplateFields,
  compileStringTemplate,
  expandPath,
  extractTemplateVars,
  keyToPathArray,
  parseDateFromEntry,
  parseDateFromEntryData,
} from '@/lib/widgets/stringTemplate';

describe('stringTemplate', () => {
  describe('keyToPathArray', () => {
    it('should return array of length 1 with simple path', () => {
      expect(keyToPathArray('category')).toEqual(['category']);
    });

    it('should return path array for complex path', () => {
      expect(keyToPathArray('categories[0].title.subtitles[0].welcome[2]')).toEqual([
        'categories',
        '0',
        'title',
        'subtitles',
        '0',
        'welcome',
        '2',
      ]);
    });
  });

  describe('parseDateFromEntry', () => {
    it('should return date based on dateFieldName', () => {
      const date = new Date().toISOString();
      const dateFieldName = 'dateFieldName';
      const entry = { data: { dateFieldName: date } };
      expect(parseDateFromEntry(entry, dateFieldName)!.toISOString()).toBe(date);
    });

    it('should return undefined on empty dateFieldName', () => {
      const entry = { data: {} };
      expect(parseDateFromEntry(entry, '')).toBeUndefined();
      expect(parseDateFromEntry(entry, null)).toBeUndefined();
      expect(parseDateFromEntry(entry, undefined)).toBeUndefined();
    });

    it('should return undefined on invalid date', () => {
      const entry = { data: { date: '' } };
      const dateFieldName = 'date';
      expect(parseDateFromEntry(entry, dateFieldName)).toBeUndefined();
    });
  });

  describe('extractTemplateVars', () => {
    it('should extract template variables', () => {
      expect(extractTemplateVars('{{slug}}-hello-{{date}}-world-{{fields.id}}')).toEqual([
        'slug',
        'date',
        'fields.id',
      ]);
    });

    it('should return empty array on no matches', () => {
      expect(extractTemplateVars('hello-world')).toEqual([]);
    });
  });

  describe('compileStringTemplate', () => {
    const date = new Date('2020-01-02T13:28:27.679Z');

    // `dateParsers` resolves in the local time zone (DCMS-2216), so pin TZ to
    // UTC for these fixtures: the literal above and its expectations below
    // are written as UTC wall-clock components.
    let originalTz: string | undefined;
    beforeAll(() => {
      originalTz = process.env.TZ;
      process.env.TZ = 'UTC';
    });
    afterAll(() => {
      process.env.TZ = originalTz;
    });

    it('should compile year variable', () => {
      expect(compileStringTemplate('{{year}}', date)).toBe('2020');
    });

    it('should compile month variable', () => {
      expect(compileStringTemplate('{{month}}', date)).toBe('01');
    });

    it('should compile day variable', () => {
      expect(compileStringTemplate('{{day}}', date)).toBe('02');
    });

    it('should compile hour variable', () => {
      expect(compileStringTemplate('{{hour}}', date)).toBe('13');
    });

    it('should compile minute variable', () => {
      expect(compileStringTemplate('{{minute}}', date)).toBe('28');
    });

    it('should compile second variable', () => {
      expect(compileStringTemplate('{{second}}', date)).toBe('27');
    });

    it('should error on missing date', () => {
      expect(() => compileStringTemplate('{{year}}')).toThrowError();
    });

    it('return compiled template', () => {
      expect(
        compileStringTemplate(
          '{{slug}}-{{year}}-{{fields.slug}}-{{title}}-{{date}}',
          date,
          'backendSlug',
          { slug: 'entrySlug', title: 'title', date },
        ),
      ).toBe('backendSlug-2020-entrySlug-title-' + date.toString());
    });

    it('return apply processor to values', () => {
      expect(
        compileStringTemplate('{{slug}}', date, 'slug', {}, value => value.toUpperCase()),
      ).toBe('SLUG');
    });

    it('return apply filter to values', () => {
      expect(
        compileStringTemplate('{{slug | upper}}-{{title | lower}}-{{year}}', date, 'backendSlug', {
          slug: 'entrySlug',
          title: 'Title',
          date,
        }),
      ).toBe('BACKENDSLUG-title-2020');
    });

    it('return apply filter to date field', () => {
      expect(
        compileStringTemplate(
          "{{slug | upper}}-{{title | lower}}-{{published | date('MM-DD')}}-{{year}}",
          date,
          'backendSlug',
          { slug: 'entrySlug', title: 'Title', published: date, date },
        ),
      ).toBe('BACKENDSLUG-title-01-02-2020');
    });

    it('return apply filter for default value', () => {
      expect(
        compileStringTemplate(
          "{{slug | upper}}-{{title | default('none')}}-{{subtitle | default('none')}}",
          date,
          'backendSlug',
          { slug: 'entrySlug', title: 'title', subtitle: null, published: date, date },
        ),
      ).toBe('BACKENDSLUG-title-none');
    });

    it('return apply filter for ternary', () => {
      expect(
        compileStringTemplate(
          "{{slug | upper}}-{{starred | ternary('star️','nostar')}}-{{done | ternary('done', 'open️')}}",
          date,
          'backendSlug',
          { slug: 'entrySlug', starred: true, done: false },
        ),
      ).toBe('BACKENDSLUG-star️-open️');
    });

    it('return apply filter for truncate', () => {
      expect(
        compileStringTemplate('{{slug | truncate(6)}}', date, 'backendSlug', {
          slug: 'entrySlug',
          starred: true,
          done: false,
        }),
      ).toBe('backen...');
    });

    it('return apply filter for truncate with custom ellipsis', () => {
      expect(
        compileStringTemplate("{{slug | truncate(3,'***')}}", date, 'backendSlug', {
          slug: 'entrySlug',
          starred: true,
          done: false,
        }),
      ).toBe('bac***');
    });

    it('leaves value unfiltered when the filter name is unknown', () => {
      expect(
        compileStringTemplate('{{title | shout}}', date, 'backendSlug', { title: 'title' }),
      ).toBe('title');
    });

    it('does not chain multiple filters on the same placeholder', () => {
      expect(
        compileStringTemplate('{{title | upper | lower}}', date, 'backendSlug', {
          title: 'Title',
        }),
      ).toBe('Title');
    });

    it('applies the filter before processor, not instead of it', () => {
      const someProcessor = (value: string, key: string) => `${key}:${value.toUpperCase()}`;
      expect(
        compileStringTemplate(
          "{{ subtitle | default('untitled') }}",
          null,
          '',
          { subtitle: '' },
          someProcessor,
        ),
      ).toBe(someProcessor('untitled', 'subtitle'));
    });

    it('does not treat an empty array or zero as falsy for default', () => {
      expect(
        compileStringTemplate(
          "{{count | default('none')}}",
          date,
          'backendSlug',
          { count: 0 },
        ),
      ).toBe('0');
    });

    describe('DCMS-2216, local time zone not UTC', () => {
      // `dateParsers` (year/month/day/hour/minute/second) must resolve
      // against the browser's local time zone. Regression test for a slug
      // dated a day earlier than the author's wall clock when the UTC day
      // still lags the local day (e.g. shortly after local midnight, east
      // of UTC).
      let originalTz: string | undefined;
      beforeEach(() => {
        originalTz = process.env.TZ;
        process.env.TZ = 'Europe/Amsterdam';
      });
      afterEach(() => {
        process.env.TZ = originalTz;
      });

      it('renders {{year}}-{{month}}-{{day}} as the local calendar day, not the UTC day', () => {
        // 2026-09-07T22:57:00Z is already 2026-09-08 00:57 in Europe/Amsterdam (CEST, UTC+2).
        const localMidnightDate = new Date('2026-09-07T22:57:00Z');
        expect(compileStringTemplate('{{year}}-{{month}}-{{day}}', localMidnightDate)).toBe(
          '2026-09-08',
        );
      });
    });
  });

  describe('expandPath', () => {
    it('should expand wildcard paths', () => {
      const data = {
        categories: [
          {
            name: 'category 1',
          },
          {
            name: 'category 2',
          },
        ],
      };

      expect(expandPath({ data, path: 'categories.*.name' })).toEqual([
        'categories.0.name',
        'categories.1.name',
      ]);
    });

    it('should handle wildcard at the end of the path', () => {
      const data = {
        nested: {
          otherNested: {
            list: [
              {
                title: 'title 1',
                nestedList: [{ description: 'description 1' }, { description: 'description 2' }],
              },
              {
                title: 'title 2',
                nestedList: [{ description: 'description 2' }, { description: 'description 2' }],
              },
            ],
          },
        },
      };

      expect(expandPath({ data, path: 'nested.otherNested.list.*.nestedList.*' })).toEqual([
        'nested.otherNested.list.0.nestedList.0',
        'nested.otherNested.list.0.nestedList.1',
        'nested.otherNested.list.1.nestedList.0',
        'nested.otherNested.list.1.nestedList.1',
      ]);
    });

    it('should handle non wildcard index', () => {
      const data = {
        categories: [
          {
            name: 'category 1',
          },
          {
            name: 'category 2',
          },
        ],
      };
      const path = 'categories.0.name';

      expect(expandPath({ data, path })).toEqual(['categories.0.name']);
    });
  });

  describe('parseDateFromEntryData', () => {
    it('returns a Date for a valid date field', () => {
      const result = parseDateFromEntryData({ published: '2020-01-02T03:04:05Z' }, 'published');
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2020-01-02T03:04:05.000Z');
    });

    it('accepts Date and numeric timestamp values', () => {
      const date = new Date('2021-06-07T08:09:10Z');
      expect(parseDateFromEntryData({ d: date }, 'd')?.getTime()).toBe(date.getTime());
      expect(parseDateFromEntryData({ d: date.getTime() }, 'd')?.getTime()).toBe(date.getTime());
    });

    it('returns undefined when the field is missing', () => {
      expect(parseDateFromEntryData({ title: 'x' }, 'published')).toBeUndefined();
    });

    it('returns undefined when the field value is falsy', () => {
      expect(parseDateFromEntryData({ published: '' }, 'published')).toBeUndefined();
      expect(parseDateFromEntryData({ published: null }, 'published')).toBeUndefined();
    });

    it('returns undefined when the date value is invalid', () => {
      expect(parseDateFromEntryData({ published: 'not a date' }, 'published')).toBeUndefined();
    });

    it('returns undefined when no field name is given', () => {
      expect(parseDateFromEntryData({ published: '2020-01-02' })).toBeUndefined();
      expect(parseDateFromEntryData({ published: '2020-01-02' }, null)).toBeUndefined();
      expect(parseDateFromEntryData({ published: '2020-01-02' }, '')).toBeUndefined();
    });
  });

  describe('SLUG_MISSING_REQUIRED_DATE', () => {
    it('is the error name string', () => {
      expect(SLUG_MISSING_REQUIRED_DATE).toBe('SLUG_MISSING_REQUIRED_DATE');
    });

    it('is thrown as the error name when a date placeholder has no date', () => {
      let error: Error | undefined;
      try {
        compileStringTemplate('{{year}}-{{slug}}', undefined, 'hello');
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeInstanceOf(Error);
      expect(error?.name).toBe(SLUG_MISSING_REQUIRED_DATE);
    });

    it('is not thrown when date processing is disabled with null', () => {
      expect(compileStringTemplate('{{year}}-{{slug}}', null, 'hello')).toBe('-hello');
    });

    it('is not thrown when the template needs no date', () => {
      expect(compileStringTemplate('{{slug}}', undefined, 'hello')).toBe('hello');
    });
  });

  describe('addFileTemplateFields', () => {
    it('adds dirname relative to folder, filename and extension (doc-comment example)', () => {
      expect(addFileTemplateFields('foo/bar/baz.ext', {}, 'foo')).toEqual({
        dirname: 'bar',
        filename: 'baz',
        extension: 'ext',
      });
    });

    it('keeps the full dirname when no folder is given', () => {
      expect(addFileTemplateFields('foo/bar/baz.ext', {})).toEqual({
        dirname: 'foo/bar',
        filename: 'baz',
        extension: 'ext',
      });
    });

    it('returns an empty extension when the file has none', () => {
      expect(addFileTemplateFields('foo/baz', {}, 'foo')).toEqual({
        dirname: '',
        filename: 'baz',
        extension: '',
      });
    });

    it('preserves existing fields and mutates the provided map', () => {
      const fields: Record<string, string> = { title: 'T' };
      const result = addFileTemplateFields('a/b.md', fields);
      expect(result).toBe(fields);
      expect(fields).toEqual({ title: 'T', dirname: 'a', filename: 'b', extension: 'md' });
    });

    it('returns fields unchanged for an empty entry path', () => {
      const fields: Record<string, string> = { title: 'T' };
      expect(addFileTemplateFields('', fields, 'foo')).toBe(fields);
      expect(fields).toEqual({ title: 'T' });
    });
  });
});
