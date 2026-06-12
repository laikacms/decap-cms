import { fromJS, Map } from 'immutable';

import {
  addFileTemplateFields,
  compileStringTemplate,
  expandPath,
  extractTemplateVars,
  keyToPathArray,
  parseDateFromEntry,
  parseDateFromEntryData,
} from '../stringTemplate';

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
      const entry = fromJS({ data: { dateFieldName: date } });
      expect(parseDateFromEntry(entry, dateFieldName).toISOString()).toBe(date);
    });

    it('should return undefined on empty dateFieldName', () => {
      const entry = fromJS({ data: {} });
      expect(parseDateFromEntry(entry, '')).toBeUndefined();
      expect(parseDateFromEntry(entry, null)).toBeUndefined();
      expect(parseDateFromEntry(entry, undefined)).toBeUndefined();
    });

    it('should return undefined on invalid date', () => {
      const entry = fromJS({ data: { date: '' } });
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
          fromJS({ slug: 'entrySlug', title: 'title', date }),
        ),
      ).toBe('backendSlug-2020-entrySlug-title-' + date.toString());
    });

    it('return apply processor to values', () => {
      expect(
        compileStringTemplate('{{slug}}', date, 'slug', fromJS({}), value => value.toUpperCase()),
      ).toBe('SLUG');
    });

    it('return apply filter to values', () => {
      expect(
        compileStringTemplate(
          '{{slug | upper}}-{{title | lower}}-{{year}}',
          date,
          'backendSlug',
          fromJS({ slug: 'entrySlug', title: 'Title', date }),
        ),
      ).toBe('BACKENDSLUG-title-2020');
    });

    it('return apply filter to date field', () => {
      expect(
        compileStringTemplate(
          "{{slug | upper}}-{{title | lower}}-{{published | date('MM-DD')}}-{{year}}",
          date,
          'backendSlug',
          fromJS({ slug: 'entrySlug', title: 'Title', published: date, date }),
        ),
      ).toBe('BACKENDSLUG-title-01-02-2020');
    });

    it('return apply filter for default value', () => {
      expect(
        compileStringTemplate(
          "{{slug | upper}}-{{title | default('none')}}-{{subtitle | default('none')}}",
          date,
          'backendSlug',
          fromJS({ slug: 'entrySlug', title: 'title', subtitle: null, published: date, date }),
        ),
      ).toBe('BACKENDSLUG-title-none');
    });

    it('return apply filter for ternary', () => {
      expect(
        compileStringTemplate(
          "{{slug | upper}}-{{starred | ternary('star️','nostar')}}-{{done | ternary('done', 'open️')}}",
          date,
          'backendSlug',
          fromJS({ slug: 'entrySlug', starred: true, done: false }),
        ),
      ).toBe('BACKENDSLUG-star️-open️');
    });

    it('return apply filter for truncate', () => {
      expect(
        compileStringTemplate(
          '{{slug | truncate(6)}}',
          date,
          'backendSlug',
          fromJS({ slug: 'entrySlug', starred: true, done: false }),
        ),
      ).toBe('backen...');
    });

    it('return apply filter for truncate', () => {
      expect(
        compileStringTemplate(
          "{{slug | truncate(3,'***')}}",
          date,
          'backendSlug',
          fromJS({ slug: 'entrySlug', starred: true, done: false }),
        ),
      ).toBe('bac***');
    });

    it('should render false boolean field value as "false"', () => {
      expect(compileStringTemplate('{{fields.draft}}', date, '', fromJS({ draft: false }))).toBe(
        'false',
      );
    });

    it('should render 0 numeric field value as "0"', () => {
      expect(compileStringTemplate('{{fields.count}}', date, '', fromJS({ count: 0 }))).toBe('0');
    });

    it('should render empty string field value as ""', () => {
      expect(compileStringTemplate('{{fields.title}}', date, '', fromJS({ title: '' }))).toBe('');
    });

    it('should render truthy string field value unchanged', () => {
      expect(compileStringTemplate('{{fields.title}}', date, '', fromJS({ title: 'hello' }))).toBe(
        'hello',
      );
    });

    it('applies | upper to a boolean field without throwing', () => {
      expect(
        compileStringTemplate('{{boolField | upper}}', date, '', fromJS({ boolField: true })),
      ).toBe('TRUE');
    });

    it('applies | lower to a boolean field without throwing', () => {
      expect(
        compileStringTemplate('{{boolField | lower}}', date, '', fromJS({ boolField: false })),
      ).toBe('false');
    });

    it('applies | upper to a number field without throwing', () => {
      expect(
        compileStringTemplate('{{numField | upper}}', date, '', fromJS({ numField: 42 })),
      ).toBe('42');
    });
  });

  describe('parseDateFromEntryData', () => {
    it('should return undefined when dateFieldName is missing', () => {
      const entryData = fromJS({ date: new Date().toISOString() });
      expect(parseDateFromEntryData(entryData, '')).toBeUndefined();
      expect(parseDateFromEntryData(entryData, null)).toBeUndefined();
      expect(parseDateFromEntryData(entryData, undefined)).toBeUndefined();
    });

    it('should return undefined for an invalid date string', () => {
      const entryData = fromJS({ date: 'not-a-date' });
      expect(parseDateFromEntryData(entryData, 'date')).toBeUndefined();
    });

    it('should return a Date object for a valid ISO string', () => {
      const isoString = '2024-03-15T10:30:00.000Z';
      const entryData = fromJS({ publishedAt: isoString });
      const result = parseDateFromEntryData(entryData, 'publishedAt');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(isoString);
    });
  });

  describe('addFileTemplateFields', () => {
    it('should return fields unchanged when entryPath is empty', () => {
      const fields = Map({ title: 'hello' });
      const result = addFileTemplateFields('', fields);
      expect(result).toBe(fields);
      expect(result.has('dirname')).toBe(false);
      expect(result.has('filename')).toBe(false);
      expect(result.has('extension')).toBe(false);
    });

    it('should set dirname, filename, and extension for a normal path', () => {
      const fields = Map();
      const result = addFileTemplateFields('blog/2024/post.md', fields, 'blog');
      expect(result.get('dirname')).toBe('2024');
      expect(result.get('filename')).toBe('post');
      expect(result.get('extension')).toBe('md');
    });

    it('should strip the folder prefix from dirname', () => {
      const fields = Map();
      const result = addFileTemplateFields('content/posts/my-post.mdx', fields, 'content/posts');
      expect(result.get('dirname')).toBe('');
      expect(result.get('filename')).toBe('my-post');
      expect(result.get('extension')).toBe('mdx');
    });

    it('should not leave a trailing slash on dirname', () => {
      const fields = Map();
      const result = addFileTemplateFields('blog/2024/post.md', fields, 'blog');
      expect(result.get('dirname')).not.toMatch(/\/$/);
    });

    it('should strip the leading dot from the extension', () => {
      const fields = Map();
      const result = addFileTemplateFields('notes/entry.txt', fields);
      expect(result.get('extension')).toBe('txt');
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
});
