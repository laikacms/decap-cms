import { describe, expect, it } from 'vitest';

import { RichtextValue } from '../../../lib/richtext/index';
// Importing the widget registers the markdown mapper as a load-time side effect.
import DecapCmsWidgetMarkdown from '../index';

const { valueSerializer } = DecapCmsWidgetMarkdown;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * The `markdown` widget (DCMS-252 Portable Text editor) persists a lazy
 * `RichtextValue`. The decap value-serializer bridges it to/from the stored
 * markdown string: `deserialize` on load (read), `serialize` on persist (save).
 * This is the round-trip superstar OD-1 / #483 depends on.
 */
describe('markdown widget valueSerializer round-trip', () => {
  const md = '# Hello\n\nA paragraph with **bold** text.';

  it('deserialize(string) builds a RichtextValue with non-empty Portable Text', () => {
    const value = valueSerializer.deserialize(md);
    expect(value).toBeInstanceOf(RichtextValue);
    expect(value.portableText.length).toBeGreaterThan(0);
  });

  it('serialize(deserialize(md)) round-trips the markdown content', () => {
    const out = valueSerializer.serialize(valueSerializer.deserialize(md));
    expect(out).toContain('Hello');
    expect(out).toContain('paragraph');
    expect(out).toContain('**bold**');
    expect(norm(out)).toContain('# Hello');
  });

  it('reflects an edit made through setPortableText (the editor save path)', () => {
    const value = valueSerializer.deserialize('original');
    value.setPortableText(valueSerializer.deserialize('# Edited heading').portableText);
    expect(norm(valueSerializer.serialize(value))).toContain('# Edited heading');
  });

  it('deserialize is idempotent on an existing RichtextValue', () => {
    const value = valueSerializer.deserialize(md);
    expect(valueSerializer.deserialize(value)).toBe(value);
  });

  it('serialize falls back to the raw string / empty for non-RichtextValue input', () => {
    expect(valueSerializer.serialize('already a string')).toBe('already a string');
    expect(valueSerializer.serialize(undefined)).toBe('');
  });
});
