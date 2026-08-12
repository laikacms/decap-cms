import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RichtextValue } from '@/lib/richtext/RichtextValue';
import { registerMapper, unregisterMapper } from '@/lib/richtext/registry';

import type { PortableTextDocument } from '@/lib/richtext/portable-text';
import type { Mapper } from '@/lib/richtext/types';

/**
 * Exposes the protected `primePristineBaseline` for direct testing.
 * `RichtextValue` only declares it `protected` because production callers
 * are editor subclasses (e.g. `LexicalRichtextValue`); the logic itself
 * lives entirely on the base class.
 */
class TestRichtextValue extends RichtextValue {
  primeBaseline(json: string): void {
    this.primePristineBaseline(json);
  }
}

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
 * string format, and normalises trailing whitespace on export — enough to
 * exercise the pristine/dirty and memoisation logic without depending on
 * the real markdown mapper.
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
      // Normalise: mapper output never has trailing whitespace, unlike raw.
      return `[${id}] ${text}`.trimEnd();
    },
    detect: () => 1,
  };
  return mapper;
}

describe('RichtextValue', () => {
  let fmtA: Mapper & { fromPortableTextCalls: number };
  let fmtB: Mapper & { fromPortableTextCalls: number };

  beforeEach(() => {
    fmtA = makeFakeMapper('fmt-a');
    fmtB = makeFakeMapper('fmt-b');
    registerMapper(fmtA);
    registerMapper(fmtB);
  });

  afterEach(() => {
    unregisterMapper('fmt-a');
    unregisterMapper('fmt-b');
  });

  describe('construction', () => {
    it('detects the input format and defaults outputFormat to it', () => {
      const value = new RichtextValue('hello', { hint: 'fmt-a' });
      expect(value.raw).toBe('hello');
      expect(value.inputFormat).toBe('fmt-a');
      expect(value.outputFormat).toBe('fmt-a');
      expect(value.portableText).toEqual(block('hello'));
    });

    it('uses an explicit outputFormat over the detected/hint format', () => {
      const value = new RichtextValue('hello', { hint: 'fmt-a', outputFormat: 'fmt-b' });
      expect(value.inputFormat).toBe('fmt-a');
      expect(value.outputFormat).toBe('fmt-b');
      expect(value.portableText).toEqual(block('hello'));
    });

    it('treats an empty raw string as an empty document', () => {
      const value = new RichtextValue('', { hint: 'fmt-a' });
      expect(value.portableText).toEqual([]);
    });
  });

  describe('toString() while pristine', () => {
    it('returns raw verbatim even when the mapper would normalise differently', () => {
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      expect(value.toString()).toBe(raw);
      expect(fmtA.fromPortableTextCalls).toBe(0);
    });

    it('toJSON() mirrors toString()', () => {
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      expect(value.toJSON()).toBe(value.toString());
    });
  });

  describe('setPortableText', () => {
    it('a structurally-identical document (mount echo) keeps the value pristine', () => {
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      // Structurally identical to the construction-time document, just a
      // different array/object reference — simulates an editor mount echo.
      value.setPortableText(JSON.parse(JSON.stringify(value.portableText)));
      expect(value.toString()).toBe(raw);
      expect(fmtA.fromPortableTextCalls).toBe(0);
    });

    it('a structurally-different document flips it dirty and toString() goes through the mapper', () => {
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      value.setPortableText(block('goodbye'));
      expect(value.toString()).toBe('[fmt-a] goodbye');
      expect(fmtA.fromPortableTextCalls).toBe(1);
    });

    it('once dirty, a later structurally-identical setPortableText stays dirty', () => {
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      value.setPortableText(block('goodbye'));
      value.toString();
      value.setPortableText(JSON.parse(JSON.stringify(value.portableText)));
      expect(value.toString()).toBe('[fmt-a] goodbye');
      expect(value.toString()).not.toBe(raw);
    });
  });

  describe('setOutputFormat', () => {
    it('flips dirty when switching to a different format', () => {
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      value.setOutputFormat('fmt-b');
      expect(value.toString()).toBe('[fmt-b] hello');
      expect(value.toString()).not.toBe(raw);
    });

    it('flips dirty even when switching back to the original format', () => {
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      value.setOutputFormat('fmt-b');
      value.setOutputFormat('fmt-a');
      expect(value.outputFormat).toBe('fmt-a');
      // Once dirty, raw can no longer stand in — even back on its original
      // format the value must go through the mapper.
      expect(value.toString()).toBe('[fmt-a] hello');
      expect(value.toString()).not.toBe(raw);
    });

    it('setting the same format is a no-op that does not flip dirty', () => {
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      value.setOutputFormat('fmt-a');
      expect(value.toString()).toBe(raw);
    });
  });

  describe('toString() memoisation', () => {
    it('calling twice without mutation does not re-invoke the mapper', () => {
      const value = new RichtextValue('hello   ', { hint: 'fmt-a' });
      value.setPortableText(block('goodbye'));

      const first = value.toString();
      const second = value.toString();

      expect(second).toBe(first);
      expect(fmtA.fromPortableTextCalls).toBe(1);
    });

    it('setPortableText invalidates the memo', () => {
      const value = new RichtextValue('hello   ', { hint: 'fmt-a' });
      value.setPortableText(block('goodbye'));
      value.toString();

      value.setPortableText(block('goodbye again'));
      const output = value.toString();

      expect(output).toBe('[fmt-a] goodbye again');
      expect(fmtA.fromPortableTextCalls).toBe(2);
    });

    it('setOutputFormat invalidates the memo', () => {
      const value = new RichtextValue('hello   ', { hint: 'fmt-a' });
      value.setPortableText(block('goodbye'));
      value.toString();

      value.setOutputFormat('fmt-b');
      const output = value.toString();

      expect(output).toBe('[fmt-b] goodbye');
      expect(fmtB.fromPortableTextCalls).toBe(1);
    });
  });

  describe('unregistered output format (pinning test, issue #2045)', () => {
    it('throws "no mapper registered" when toString() runs against a format nobody registered', () => {
      // Mirrors the real-world failure: a collection sets `format: html` (or
      // `plainText`) on a richtext field, but the site never called
      // `CMS.registerRichtextFormat(htmlFormat)` — only markdown is
      // registered automatically (`src/app/extensions.ts`). Saving throws
      // instead of silently switching format. See
      // `src/widgets/richtext/README.md#format-packs` and
      // `docs/editor-guide.md`.
      const raw = 'hello   ';
      const value = new RichtextValue(raw, { hint: 'fmt-a' });
      value.setOutputFormat('html');
      value.setPortableText(block('goodbye')); // leave "pristine" so toString() must go through the mapper
      expect(() => value.toString()).toThrow(/no mapper registered for id "html"/);
    });
  });

  describe('primePristineBaseline', () => {
    it('sets the comparison baseline only while still pristine', () => {
      const raw = 'hello   ';
      const value = new TestRichtextValue(raw, { hint: 'fmt-a' });
      const bridged = block('bridged-echo');
      value.primeBaseline(JSON.stringify(bridged));

      // The bridged doc now defines "pristine"; echoing it back keeps the
      // value pristine even though it differs from the construction-time PT.
      value.setPortableText(bridged);
      expect(value.toString()).toBe(raw);
    });

    it('is a no-op once the value is already dirty', () => {
      const raw = 'hello   ';
      const value = new TestRichtextValue(raw, { hint: 'fmt-a' });
      value.setPortableText(block('goodbye'));
      expect(value.toString()).toBe('[fmt-a] goodbye');

      value.primeBaseline(JSON.stringify(block('goodbye')));
      // Priming after going dirty must not resurrect pristine behaviour.
      value.setPortableText(block('goodbye'));
      expect(value.toString()).toBe('[fmt-a] goodbye');
    });
  });
});
