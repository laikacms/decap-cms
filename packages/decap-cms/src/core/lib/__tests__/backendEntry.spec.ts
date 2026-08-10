import { beforeAll, describe, expect, it } from 'vitest';

import { entryDataFromContent, legacyRaw, toBackendEntry } from '@/core/lib/backendEntry';
import { registerEntryCodec } from '@/core/lib/registry';
import { jsonEntryCodec } from '@/entry-codecs/json/index';
import { parsedContent, rawContent } from '@/lib/backend/index';

describe('toBackendEntry', () => {
  it('wraps a legacy entry as raw content', () => {
    expect(toBackendEntry({ file: { path: 'a.md', id: 'sha' }, data: 'title: Hello' })).toEqual({
      file: { path: 'a.md', id: 'sha' },
      content: { kind: 'raw', raw: 'title: Hello' },
    });
  });

  it('structures the legacy author name', () => {
    const { file } = toBackendEntry({
      file: { path: 'a.md', author: 'Ada', updatedOn: '2026-08-10T09:00:00.000Z' },
      data: '',
    });

    expect(file.author).toEqual({ name: 'Ada' });
    expect(file.updatedOn).toBe('2026-08-10T09:00:00.000Z');
  });

  it('drops the echoed label, which is collection config', () => {
    const { file } = toBackendEntry({
      file: { path: 'config/general.yml', label: 'General Settings' },
      data: '',
    });

    expect(file).not.toHaveProperty('label');
  });

  it('omits metadata the backend did not report rather than setting it undefined', () => {
    const { file } = toBackendEntry({ file: { path: 'a.md' }, data: '' });

    expect(Object.keys(file)).toEqual(['path']);
  });

  it('passes an entry that is already in the seam shape through untouched', () => {
    const entry = { file: { path: 'a.md' }, content: parsedContent({ title: 'Hello' }) };

    expect(toBackendEntry(entry)).toBe(entry);
  });
});

describe('entryDataFromContent', () => {
  const collection = { name: 'posts', format: 'json' } as never;

  beforeAll(() => {
    registerEntryCodec(jsonEntryCodec);
  });

  it('takes structured data by reference', () => {
    const data = { title: 'Hello' };

    expect(entryDataFromContent(collection, 'a.json', parsedContent(data))).toBe(data);
  });

  it('parses raw content with the collection format', () => {
    expect(entryDataFromContent(collection, 'a.json', rawContent('{"title":"Hello"}')))
      .toEqual({ title: 'Hello' });
  });
});

describe('legacyRaw', () => {
  it('is the source text for raw content', () => {
    expect(legacyRaw(rawContent('title: Hello'))).toBe('title: Hello');
  });

  it('is empty for structured content, which has no source text', () => {
    expect(legacyRaw(parsedContent({ title: 'Hello' }))).toBe('');
  });
});
