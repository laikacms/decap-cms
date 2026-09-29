import { describe, expect, it } from 'vitest';

import { isHTMLElement } from '@/ui/editor/utils/guard';

describe('isHTMLElement', () => {
  it('returns true for HTML elements', () => {
    expect(isHTMLElement(document.createElement('div'))).toBe(true);
    expect(isHTMLElement(document.createElement('span'))).toBe(true);
  });

  it('returns false for text nodes', () => {
    expect(isHTMLElement(document.createTextNode('hi'))).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isHTMLElement(null)).toBe(false);
    expect(isHTMLElement(undefined)).toBe(false);
  });

  it('returns false for plain objects and primitives', () => {
    expect(isHTMLElement({})).toBe(false);
    expect(isHTMLElement({ tagName: 'DIV' })).toBe(false);
    expect(isHTMLElement('div')).toBe(false);
  });
});
