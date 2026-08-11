import { describe, expect, it } from 'vitest';

import * as apiUtils from '@/lib/util/APIUtils.js';
describe('APIUtils', () => {
  describe('generateContentKey', () => {
    it('should generate content key', () => {
      expect(apiUtils.generateContentKey('posts', 'dir1/dir2/post-title')).toBe(
        'posts/dir1/dir2/post-title',
      );
    });
  });

  describe('parseContentKey', () => {
    it('should parse content key', () => {
      expect(apiUtils.parseContentKey('posts/dir1/dir2/post-title')).toEqual({
        collection: 'posts',
        slug: 'dir1/dir2/post-title',
      });
    });

    it('should round-trip with generateContentKey', () => {
      const contentKey = apiUtils.generateContentKey('posts', 'dir1/dir2/post-title');
      expect(apiUtils.parseContentKey(contentKey)).toEqual({
        collection: 'posts',
        slug: 'dir1/dir2/post-title',
      });
    });
  });

  describe('branchFromContentKey / contentKeyFromBranch', () => {
    it('should prefix the content key with the cms/ branch prefix', () => {
      expect(apiUtils.branchFromContentKey('posts/dir1/dir2/post-title')).toBe(
        'cms/posts/dir1/dir2/post-title',
      );
    });

    it('should strip the cms/ branch prefix back off', () => {
      expect(apiUtils.contentKeyFromBranch('cms/posts/dir1/dir2/post-title')).toBe(
        'posts/dir1/dir2/post-title',
      );
    });

    it('should round-trip a content key through branchFromContentKey and contentKeyFromBranch', () => {
      const contentKey = apiUtils.generateContentKey('posts', 'dir1/dir2/post-title');
      const branch = apiUtils.branchFromContentKey(contentKey);
      expect(branch.startsWith(`${apiUtils.CMS_BRANCH_PREFIX}/`)).toBe(true);
      expect(apiUtils.contentKeyFromBranch(branch)).toBe(contentKey);
    });
  });

  describe('isCMSLabel', () => {
    it('should return true for CMS label', () => {
      expect(apiUtils.isCMSLabel('decap-cms/draft', 'decap-cms/')).toBe(true);
    });

    it('should return false for non CMS label', () => {
      expect(apiUtils.isCMSLabel('other/Label', 'decap-cms/')).toBe(false);
    });

    it('should return true if the prefix not provided for CMS label', () => {
      expect(apiUtils.isCMSLabel('decap-cms/draft', '')).toBe(true);
    });

    it('should return false if a different prefix provided for CMS label', () => {
      expect(apiUtils.isCMSLabel('decap-cms/draft', 'other/')).toBe(false);
    });

    it('should return true for CMS label when undefined prefix is passed', () => {
      expect(apiUtils.isCMSLabel('decap-cms/draft', undefined as unknown as string)).toBe(true);
    });
  });

  describe('labelToStatus', () => {
    it('should get status from label when default prefix is passed', () => {
      expect(apiUtils.labelToStatus('decap-cms/draft', 'decap-cms/')).toBe('draft');
    });

    it('should get status from label when custom prefix is passed', () => {
      expect(apiUtils.labelToStatus('other/draft', 'other/')).toBe('draft');
    });

    it('should get status from label when empty prefix is passed', () => {
      expect(apiUtils.labelToStatus('decap-cms/draft', '')).toBe('draft');
    });

    it('should get status from label when undefined prefix is passed', () => {
      expect(apiUtils.labelToStatus('decap-cms/draft', undefined as unknown as string)).toBe(
        'draft',
      );
    });
  });

  describe('statusToLabel', () => {
    it('should generate label from status when default prefix is passed', () => {
      expect(apiUtils.statusToLabel('draft', 'decap-cms/')).toBe('decap-cms/draft');
    });
    it('should generate label from status when custom prefix is passed', () => {
      expect(apiUtils.statusToLabel('draft', 'other/')).toBe('other/draft');
    });
    it('should generate label from status when empty prefix is passed', () => {
      expect(apiUtils.statusToLabel('draft', '')).toBe('decap-cms/draft');
    });
    it('should generate label from status when undefined prefix is passed', () => {
      expect(apiUtils.statusToLabel('draft', undefined as unknown as string)).toBe(
        'decap-cms/draft',
      );
    });
  });
});
