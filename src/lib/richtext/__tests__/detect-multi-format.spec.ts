import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detectMapper } from '../detect';
import { htmlMapper } from '../html-mapper';
import { markdownMapper } from '../markdown-mapper';
import { plainTextMapper } from '../plaintext-mapper';
import { portableTextMapper } from '../portable-text-mapper';
import { registerMapper, unregisterMapper } from '../registry';

/**
 * With all four bundled mappers registered (DCMS-253), `detectMapper` must
 * still pick the right format for unambiguous input, and defer to `hint`
 * when scores are close — the same contract the markdown-only widget
 * already relied on.
 */
describe('detectMapper with the full bundled mapper set', () => {
  beforeEach(() => {
    registerMapper(markdownMapper);
    registerMapper(htmlMapper);
    registerMapper(plainTextMapper);
    registerMapper(portableTextMapper);
  });

  afterEach(() => {
    unregisterMapper(markdownMapper.id);
    unregisterMapper(htmlMapper.id);
    unregisterMapper(plainTextMapper.id);
    unregisterMapper(portableTextMapper.id);
  });

  it('detects HTML', () => {
    expect(detectMapper('<h1>Hi</h1><p>Body <strong>text</strong>.</p>')).toBe('html');
  });

  it('detects markdown', () => {
    expect(detectMapper('# Heading\n\nA paragraph with **bold** text.')).toBe('markdown');
  });

  it('detects a Portable Text JSON document', () => {
    const doc = JSON.stringify([
      { _type: 'block', _key: 'k0', children: [{ _type: 'span', _key: 'k1', text: 'hi', marks: [] }] },
    ]);
    expect(detectMapper(doc)).toBe('portableText');
  });

  it('falls back to the hint for ambiguous plain prose', () => {
    expect(detectMapper('Just some plain prose.', 'plainText')).toBe('plainText');
    expect(detectMapper('Just some plain prose.', 'markdown')).toBe('markdown');
  });
});
