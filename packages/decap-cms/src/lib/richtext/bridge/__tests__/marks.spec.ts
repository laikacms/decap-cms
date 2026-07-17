import { describe, expect, it } from 'vitest';

import {
  decoratorsToFormat,
  FORMAT_BOLD,
  FORMAT_CODE,
  FORMAT_HIGHLIGHT,
  FORMAT_ITALIC,
  FORMAT_STRIKETHROUGH,
  FORMAT_SUBSCRIPT,
  FORMAT_SUPERSCRIPT,
  FORMAT_UNDERLINE,
  formatToDecorators,
  isDecorator,
} from '@/lib/richtext/bridge/marks.js';

describe('richtext/bridge/marks', () => {
  describe('isDecorator', () => {
    it.each([
      'strong',
      'em',
      'strike-through',
      'underline',
      'code',
      'sub',
      'sup',
      'highlight',
    ])('returns true for known decorator %s', (mark) => {
      expect(isDecorator(mark)).toBe(true);
    });

    it('returns false for an unknown/annotation-only mark', () => {
      expect(isDecorator('link')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isDecorator('')).toBe(false);
    });

    it('does not report a match for inherited Object.prototype keys', () => {
      expect(isDecorator('toString')).toBe(false);
      expect(isDecorator('hasOwnProperty')).toBe(false);
      expect(isDecorator('constructor')).toBe(false);
    });
  });

  describe('decoratorsToFormat', () => {
    it('returns 0 for an empty list', () => {
      expect(decoratorsToFormat([])).toBe(0);
    });

    it('maps a single known decorator to its bit', () => {
      expect(decoratorsToFormat(['strong'])).toBe(FORMAT_BOLD);
      expect(decoratorsToFormat(['em'])).toBe(FORMAT_ITALIC);
      expect(decoratorsToFormat(['strike-through'])).toBe(FORMAT_STRIKETHROUGH);
      expect(decoratorsToFormat(['underline'])).toBe(FORMAT_UNDERLINE);
      expect(decoratorsToFormat(['code'])).toBe(FORMAT_CODE);
      expect(decoratorsToFormat(['sub'])).toBe(FORMAT_SUBSCRIPT);
      expect(decoratorsToFormat(['sup'])).toBe(FORMAT_SUPERSCRIPT);
      expect(decoratorsToFormat(['highlight'])).toBe(FORMAT_HIGHLIGHT);
    });

    it('combines multiple marks into the correct bitfield', () => {
      const format = decoratorsToFormat(['strong', 'em', 'code']);
      expect(format).toBe(FORMAT_BOLD | FORMAT_ITALIC | FORMAT_CODE);
    });

    it('combines all known decorators into the full bitfield', () => {
      const format = decoratorsToFormat([
        'strong',
        'em',
        'strike-through',
        'underline',
        'code',
        'sub',
        'sup',
        'highlight',
      ]);
      expect(format).toBe(255);
    });

    it('ignores unknown marks while still combining known ones', () => {
      const format = decoratorsToFormat(['strong', 'link', 'em', 'annotation']);
      expect(format).toBe(FORMAT_BOLD | FORMAT_ITALIC);
    });

    it('returns 0 when only unknown marks are given', () => {
      expect(decoratorsToFormat(['link', 'annotation'])).toBe(0);
    });

    it('is unaffected by duplicate decorator entries', () => {
      expect(decoratorsToFormat(['strong', 'strong'])).toBe(FORMAT_BOLD);
    });
  });

  describe('formatToDecorators', () => {
    it('returns an empty array for a format of 0', () => {
      expect(formatToDecorators(0)).toEqual([]);
    });

    it('expands a single bit into its decorator name', () => {
      expect(formatToDecorators(FORMAT_BOLD)).toEqual(['strong']);
      expect(formatToDecorators(FORMAT_HIGHLIGHT)).toEqual(['highlight']);
    });

    it('expands a combined bitfield into decorators in fixed order, regardless of bit combination order', () => {
      expect(formatToDecorators(FORMAT_CODE | FORMAT_BOLD)).toEqual(['strong', 'code']);
      expect(formatToDecorators(FORMAT_BOLD | FORMAT_CODE)).toEqual(['strong', 'code']);
    });

    it('expands all-bits-set into every decorator in fixed order', () => {
      expect(formatToDecorators(255)).toEqual([
        'strong',
        'em',
        'strike-through',
        'underline',
        'code',
        'sub',
        'sup',
        'highlight',
      ]);
    });

    it('ignores unrelated high bits not covered by the known decorators', () => {
      expect(formatToDecorators(256 | FORMAT_BOLD)).toEqual(['strong']);
    });
  });

  describe('round-trip', () => {
    it('decoratorsToFormat -> formatToDecorators preserves fixed order regardless of input order', () => {
      const format = decoratorsToFormat(['highlight', 'strong', 'sup']);
      expect(formatToDecorators(format)).toEqual(['strong', 'sup', 'highlight']);
    });
  });
});
