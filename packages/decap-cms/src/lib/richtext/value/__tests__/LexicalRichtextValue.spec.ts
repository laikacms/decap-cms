import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { lexicalToPortableText } from '@/lib/richtext/bridge/lexicalToPortableText';
import { portableTextToLexical } from '@/lib/richtext/bridge/portableTextToLexical';
import { registerMapper, unregisterMapper } from '@/lib/richtext/registry';
import { createLexicalRichtextValue, LexicalRichtextValue } from '@/lib/richtext/value/LexicalRichtextValue';

import type { PortableTextDocument } from '@/lib/richtext/portable-text';
import type { Mapper } from '@/lib/richtext/types';
import type { SerializedEditorState } from 'lexical';

function block(text: string, key = 'k0'): PortableTextDocument {
  return [
    {
      _type: 'block',
      _key: key,
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: `${key}-s0`, text, marks: [] }],
    },
  ];
}

/**
 * A fake mapper that round-trips through a trivial "one block per line"
 * string format, and normalises trailing whitespace on export — same shape
 * as `RichtextValue.spec.ts` (DCMS-1811), enough to exercise the pristine/
 * dirty logic without depending on the real markdown mapper. The produced
 * Portable Text uses real block/span shapes so it flows through the real
 * `portableTextToLexical` / `lexicalToPortableText` bridge unchanged.
 */
function makeFakeMapper(id: string): Mapper & { fromPortableTextCalls: number } {
  const mapper = {
    id,
    fromPortableTextCalls: 0,
    toPortableText: (value: string): PortableTextDocument =>
      value === '' ? [] : block(value.trim()),
    fromPortableText(doc: PortableTextDocument): string {
      mapper.fromPortableTextCalls += 1;
      const first = doc[0] as { children?: Array<{ text?: string }> } | undefined;
      const text = first?.children?.[0]?.text ?? '';
      return `[${id}] ${text}`.trimEnd();
    },
    detect: () => 1,
  };
  return mapper;
}

describe('LexicalRichtextValue', () => {
  let fmtA: Mapper & { fromPortableTextCalls: number };

  beforeEach(() => {
    fmtA = makeFakeMapper('fmt-a');
    registerMapper(fmtA);
  });

  afterEach(() => {
    unregisterMapper('fmt-a');
  });

  describe('construction', () => {
    it('bridges the detected portableText into editorState via portableTextToLexical', () => {
      const raw = 'hello';
      const value = new LexicalRichtextValue(raw, { hint: 'fmt-a' });

      expect(value.portableText).toEqual(block('hello'));
      // portableTextToLexical is a pure, deterministic function: re-running
      // it on the same portableText must reproduce the same editorState the
      // constructor derived.
      expect(value.editorState).toEqual(portableTextToLexical(value.portableText));
    });

    it(
      'primes the pristine baseline from the bridged document (lexicalToPortableText(editorState)), '
        + 'not the construction-time portableText (DCMS-471)',
      () => {
        const raw = 'hello   ';
        const value = new LexicalRichtextValue(raw, { hint: 'fmt-a' });

        // The Lexical bridge regenerates `_key`s (portableTextToLexical drops
        // them, lexicalToPortableText assigns fresh ones), so the bridged
        // document is structurally different from the construction-time PT
        // even though the text content is identical.
        const bridged = lexicalToPortableText(value.editorState);
        expect(JSON.stringify(bridged)).not.toBe(JSON.stringify(value.portableText));

        // The Lexical mount echo hands the editor's own state straight back
        // through setEditorState — simulate that with a structurally
        // identical (different reference) SerializedEditorState.
        const mountEcho = JSON.parse(JSON.stringify(value.editorState)) as SerializedEditorState;
        value.setEditorState(mountEcho);

        // If the baseline had been primed from the raw construction-time
        // portableText (instead of the bridged document), this mount echo
        // would incorrectly flip the value dirty.
        expect(value.toString()).toBe(raw);
        expect(fmtA.fromPortableTextCalls).toBe(0);
      },
    );
  });

  describe('setEditorState', () => {
    it('a structurally different state flips the value dirty and derives portableText via lexicalToPortableText', () => {
      const raw = 'hello   ';
      const value = new LexicalRichtextValue(raw, { hint: 'fmt-a' });

      const nextState = portableTextToLexical(block('goodbye'));
      value.setEditorState(nextState);

      expect(value.editorState).toBe(nextState);
      expect(value.portableText).toEqual(lexicalToPortableText(nextState));
      expect(value.toString()).toBe('[fmt-a] goodbye');
      expect(value.toString()).not.toBe(raw);
      expect(fmtA.fromPortableTextCalls).toBe(1);
    });

    it('a structurally-identical (mount-echo) state keeps the value pristine', () => {
      const raw = 'hello   ';
      const value = new LexicalRichtextValue(raw, { hint: 'fmt-a' });

      const mountEcho = JSON.parse(JSON.stringify(value.editorState)) as SerializedEditorState;
      value.setEditorState(mountEcho);

      expect(value.toString()).toBe(raw);
      expect(fmtA.fromPortableTextCalls).toBe(0);
    });

    it('once dirty, a later structurally-identical setEditorState stays dirty', () => {
      const raw = 'hello   ';
      const value = new LexicalRichtextValue(raw, { hint: 'fmt-a' });

      value.setEditorState(portableTextToLexical(block('goodbye')));
      value.toString();

      const echoOfDirtyState = JSON.parse(JSON.stringify(value.editorState)) as SerializedEditorState;
      value.setEditorState(echoOfDirtyState);

      expect(value.toString()).toBe('[fmt-a] goodbye');
      expect(value.toString()).not.toBe(raw);
    });
  });

  describe('createLexicalRichtextValue', () => {
    it('returns a working instance equivalent to new LexicalRichtextValue(...)', () => {
      const raw = 'hello';
      const viaFactory = createLexicalRichtextValue(raw, { hint: 'fmt-a' });
      const viaConstructor = new LexicalRichtextValue(raw, { hint: 'fmt-a' });

      expect(viaFactory).toBeInstanceOf(LexicalRichtextValue);
      expect(viaFactory.raw).toBe(viaConstructor.raw);
      expect(viaFactory.portableText).toEqual(viaConstructor.portableText);
      expect(viaFactory.editorState).toEqual(viaConstructor.editorState);
      expect(viaFactory.toString()).toBe(viaConstructor.toString());

      // The factory-built instance behaves like a real LexicalRichtextValue,
      // not a plain object: setEditorState still drives dirty/pristine state.
      viaFactory.setEditorState(portableTextToLexical(block('goodbye')));
      expect(viaFactory.toString()).toBe('[fmt-a] goodbye');
    });
  });
});
