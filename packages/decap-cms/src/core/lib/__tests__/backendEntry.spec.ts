import { beforeAll, describe, expect, it } from 'vitest';

import { entryDataFromContent, legacyRaw } from '@/core/lib/backendEntry';
import { registerEntryCodec } from '@/core/lib/registry';
import { jsonEntryCodec } from '@/entry-codecs/json/index';
import { parsedContent, rawContent } from '@/lib/backend/index';

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
