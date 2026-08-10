import { describe, expect, expectTypeOf, it } from 'vitest';

import { assertNeverContent, parsedContent, rawContent } from '@/lib/backend/index';

import type {
  BackendEntry,
  BackendEntryContent,
  ParsedContent,
  RawContent,
} from '@/lib/backend/index';

/**
 * The shape every consumer of the seam takes: switch exhaustively on `kind`,
 * end with `assertNeverContent`, so adding a content kind is a compile error
 * here rather than a silent fallthrough.
 */
function describeContent(content: BackendEntryContent): string {
  switch (content.kind) {
    case 'raw':
      return `raw:${content.raw}`;
    case 'parsed':
      return `parsed:${Object.keys(content.data).join(',')}`;
    default:
      return assertNeverContent(content);
  }
}

describe('backend entry content', () => {
  it('builds raw content', () => {
    expect(rawContent('title: Hello')).toEqual({ kind: 'raw', raw: 'title: Hello' });
  });

  it('builds parsed content', () => {
    expect(parsedContent({ title: 'Hello' })).toEqual({
      kind: 'parsed',
      data: { title: 'Hello' },
    });
  });

  it('passes structured data through by reference, with no round trip', () => {
    const data = { title: 'Hello' };
    expect(parsedContent(data).data).toBe(data);
  });

  it('drives an exhaustive switch', () => {
    expect(describeContent(rawContent('title: Hello'))).toBe('raw:title: Hello');
    expect(describeContent(parsedContent({ title: 'Hello' }))).toBe('parsed:title');
  });

  it('throws when handed a kind no consumer handles', () => {
    const unknownKind = { kind: 'virtual' } as unknown as BackendEntryContent;
    expect(() => describeContent(unknownKind)).toThrow(/Unhandled entry content kind: virtual/);
  });
});

describe('backend entry content types', () => {
  it('narrows the union on kind', () => {
    function narrow(content: BackendEntryContent) {
      if (content.kind === 'raw') {
        expectTypeOf(content).toEqualTypeOf<RawContent>();
      } else {
        expectTypeOf(content).toEqualTypeOf<ParsedContent>();
      }
    }
    expect(narrow).toBeTypeOf('function');
  });

  it('requires the discriminant and the payload that goes with it', () => {
    expectTypeOf<BackendEntry['content']>().toEqualTypeOf<BackendEntryContent>();
    // Tagged 'raw' but carrying a parsed payload: not a member of the union.
    expectTypeOf<{ kind: 'raw', data: Record<string, unknown> }>()
      .not.toExtend<BackendEntryContent>();
    // Untagged content is not a member either, so consumers can always switch.
    expectTypeOf<{ raw: string }>().not.toExtend<BackendEntryContent>();
  });

  it('types the seam author as a structured object, not a name string', () => {
    expectTypeOf<{ name: string }>().toExtend<NonNullable<BackendEntry['file']['author']>>();
    expectTypeOf<string>().not.toExtend<BackendEntry['file']['author']>();
  });
});
