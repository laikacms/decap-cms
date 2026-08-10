import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Backend } from '@/core/backend';
import { FILES, FOLDER } from '@/core/constants/collectionTypes';
import {
  getCustomFormatsExtensions,
  getCustomFormatsFormatters,
  getEntryCodec,
  getEntryCodecs,
} from '@/core/lib/registry';
import { yamlEntryCodec } from '@/entry-codecs/yaml/index';
import { parsedContent, rawContent } from '@/lib/backend/index';

vi.mock('../lib/registry');

/**
 * The engine's read path against a fake implementation, driven through the
 * public API (`listEntries` / `getEntry`) rather than the parse helpers.
 *
 * A backend may hand content over as raw text (parsed here with the
 * collection's format) or as structured data (passed straight through). The
 * two must produce the same entry, and the structured path must not parse or
 * serialize anything - see `docs/contributing/decisions/entry-type-redesign.md`.
 */

const collection = {
  name: 'posts',
  type: FOLDER,
  folder: 'content/posts',
  format: 'yaml',
  fields: [{ name: 'title' }],
};

const config = { backend: { name: 'test' } };

function makeBackend(implementation: Record<string, unknown>) {
  return new Backend({ init: () => implementation } as never, {
    backendName: 'test',
    config: config as never,
  });
}

beforeEach(() => {
  vi.mocked(getEntryCodecs).mockImplementation(() => [yamlEntryCodec]);
  vi.mocked(getEntryCodec).mockImplementation(
    name => (name === yamlEntryCodec.name ? yamlEntryCodec : undefined),
  );
  vi.mocked(getCustomFormatsExtensions).mockImplementation(() => ({}));
  vi.mocked(getCustomFormatsFormatters).mockImplementation(() => ({}));
});

// Enough of the store for `processEntry`'s media-folder resolution.
const state = { config, integrations: {}, mediaLibrary: { files: [] }, entries: {} };

describe('read path: raw content', () => {
  it('parses a legacy `{ data: string }` entry with the collection format', async () => {
    const backend = makeBackend({
      entriesByFolder: () =>
        Promise.resolve([
          { file: { path: 'content/posts/hello.yml', id: 'sha1' }, data: 'title: Hello\n' },
        ]),
    });

    const { entries } = await backend.listEntries(collection as never);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      collection: 'posts',
      slug: 'hello',
      path: 'content/posts/hello.yml',
      data: { title: 'Hello' },
      raw: 'title: Hello\n',
    });
  });

  it('parses a `content: raw` entry the same way', async () => {
    const backend = makeBackend({
      entriesByFolder: () =>
        Promise.resolve([
          {
            file: { path: 'content/posts/hello.yml', id: 'sha1' },
            content: rawContent('title: Hello\n'),
          },
        ]),
    });

    const { entries } = await backend.listEntries(collection as never);

    expect(entries[0]).toMatchObject({
      slug: 'hello',
      data: { title: 'Hello' },
      raw: 'title: Hello\n',
    });
  });

  it('yields an entry with no fields when the content does not parse', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const backend = makeBackend({
      entriesByFolder: () =>
        Promise.resolve([
          { file: { path: 'content/posts/broken.yml' }, data: 'title: "unterminated\n' },
        ]),
    });

    const { entries } = await backend.listEntries(collection as never);

    expect(entries).toHaveLength(1);
    expect(entries[0].data).toEqual({});
  });
});

describe('read path: parsed content', () => {
  it('passes structured data through without parsing', async () => {
    const data = { title: 'Hello' };
    const backend = makeBackend({
      entriesByFolder: () =>
        Promise.resolve([
          { file: { path: 'content/posts/hello.yml', id: 'v3' }, content: parsedContent(data) },
        ]),
    });

    const { entries } = await backend.listEntries(collection as never);

    // By reference: a backend that already holds documents pays for no
    // serialize/parse round trip.
    expect(entries[0].data).toBe(data);
    expect(entries[0]).toMatchObject({ slug: 'hello', path: 'content/posts/hello.yml' });
  });

  it('needs no registered entry codec at all', async () => {
    vi.mocked(getEntryCodecs).mockImplementation(() => []);
    vi.mocked(getEntryCodec).mockImplementation(() => undefined);

    // No `format`, and nothing registered to parse one with: a structured
    // backend's consumers never have to register a codec.
    const codecFreeCollection = { ...collection, format: undefined, extension: 'json' };
    const backend = makeBackend({
      entriesByFolder: () =>
        Promise.resolve([
          {
            file: { path: 'content/posts/hello.json' },
            content: parsedContent({ title: 'Hello' }),
          },
        ]),
    });

    const { entries } = await backend.listEntries(codecFreeCollection as never);

    expect(entries[0].data).toEqual({ title: 'Hello' });
  });

  it('carries structured content through getEntry', async () => {
    const backend = makeBackend({
      getEntry: (path: string) => Promise.resolve({ file: { path }, content: parsedContent({ title: 'Hello' }) }),
    });

    const entry = await backend.getEntry(state as never, collection as never, 'hello');

    expect(entry).toMatchObject({
      slug: 'hello',
      path: 'content/posts/hello.yml',
      data: { title: 'Hello' },
    });
    // No source text exists for structured content.
    expect(entry.raw).toBe('');
  });
});

describe('read path: seam metadata', () => {
  it('takes the structured author from the seam', async () => {
    const backend = makeBackend({
      entriesByFolder: () =>
        Promise.resolve([
          {
            file: {
              path: 'content/posts/hello.yml',
              author: { name: 'Ada', id: 'ada@example.com' },
              updatedOn: '2026-08-10T09:00:00.000Z',
            },
            content: parsedContent({ title: 'Hello' }),
          },
        ]),
    });

    const { entries } = await backend.listEntries(collection as never);

    expect(entries[0]).toMatchObject({
      author: 'Ada',
      updatedOn: '2026-08-10T09:00:00.000Z',
    });
  });

  it('derives a file collection label from config rather than the seam', async () => {
    const fileCollection = {
      name: 'settings',
      type: FILES,
      extension: 'yml',
      files: [
        { name: 'general', label: 'General Settings', file: 'config/general.yml', fields: [] },
      ],
    };
    const backend = makeBackend({
      // A backend that echoes nothing back: no label, no author.
      entriesByFiles: () =>
        Promise.resolve([
          { file: { path: 'config/general.yml' }, content: parsedContent({ title: 'Hello' }) },
        ]),
    });

    const { entries } = await backend.listEntries(fileCollection as never);

    expect(entries[0]).toMatchObject({ slug: 'general', label: 'General Settings' });
  });
});
