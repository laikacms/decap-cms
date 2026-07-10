import { describe, expect, it } from 'vitest';

import { portableTextMapper } from '../portable-text-mapper';

import type { PortableTextDocument } from '../portable-text';

const doc: PortableTextDocument = [
  {
    _type: 'block',
    _key: 'k0',
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: 'k1', text: 'Hello', marks: [] }],
  },
];

describe('portableTextMapper (identity)', () => {
  it('serializes a Portable Text document to JSON', () => {
    expect(JSON.parse(portableTextMapper.fromPortableText(doc))).toEqual(doc);
  });

  it('round-trips PT -> string -> PT with no change', () => {
    const serialized = portableTextMapper.fromPortableText(doc);
    expect(portableTextMapper.toPortableText(serialized)).toEqual(doc);
  });

  it('throws for a JSON value that is not a Portable Text document', () => {
    expect(() => portableTextMapper.toPortableText('{"not":"an array"}')).toThrow();
    expect(() => portableTextMapper.toPortableText('[1, 2, 3]')).toThrow();
  });

  describe('detect', () => {
    it('scores a valid PT document array at 1', () => {
      expect(portableTextMapper.detect(JSON.stringify(doc))).toBe(1);
    });

    it('scores invalid JSON at 0', () => {
      expect(portableTextMapper.detect('not json at all')).toBe(0);
    });

    it('scores well-formed JSON that is not a PT document at 0', () => {
      expect(portableTextMapper.detect('{"foo":"bar"}')).toBe(0);
    });
  });
});
