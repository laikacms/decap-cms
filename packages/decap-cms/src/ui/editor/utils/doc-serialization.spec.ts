import { type SerializedDocument } from '@lexical/file';
import { describe, expect, it } from 'vitest';

import { docFromHash, docToHash } from './doc-serialization';

function buildDoc(): SerializedDocument {
  return {
    editorState: {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Hello, DCMS-1258!',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    } as SerializedDocument['editorState'],
    lastSaved: 1_752_500_000_000,
    source: 'Lexical',
    version: '0.48.0',
  };
}

describe('doc-serialization', () => {
  it('round-trips a SerializedDocument through docToHash/docFromHash', async () => {
    const doc = buildDoc();

    const hash = await docToHash(doc);
    expect(hash.startsWith('#doc=')).toBe(true);

    const restored = await docFromHash(hash);
    expect(restored).toEqual(doc);
  });

  it('returns null for a hash without the #doc= prefix', async () => {
    expect(await docFromHash('#not-a-doc=abc')).toBeNull();
    expect(await docFromHash('')).toBeNull();
    expect(await docFromHash('#foo=bar')).toBeNull();
  });
});
