import { createEntry } from '../Entry';

describe('createEntry', () => {
  describe('default options', () => {
    it('sets required fields from arguments', () => {
      const entry = createEntry('posts', 'my-slug', '/posts/my-slug.md');
      expect(entry.collection).toBe('posts');
      expect(entry.slug).toBe('my-slug');
      expect(entry.path).toBe('/posts/my-slug.md');
    });

    it('defaults slug and path to empty string when omitted', () => {
      const entry = createEntry('posts');
      expect(entry.slug).toBe('');
      expect(entry.path).toBe('');
    });

    it('defaults partial to false', () => {
      expect(createEntry('posts').partial).toBe(false);
    });

    it('defaults raw to empty string', () => {
      expect(createEntry('posts').raw).toBe('');
    });

    it('defaults data to empty object', () => {
      expect(createEntry('posts').data).toEqual({});
    });

    it('defaults label to null', () => {
      expect(createEntry('posts').label).toBeNull();
    });

    it('defaults isModification to null', () => {
      expect(createEntry('posts').isModification).toBeNull();
    });

    it('defaults mediaFiles to empty array', () => {
      expect(createEntry('posts').mediaFiles).toEqual([]);
    });

    it('defaults author to empty string', () => {
      expect(createEntry('posts').author).toBe('');
    });

    it('defaults updatedOn to empty string', () => {
      expect(createEntry('posts').updatedOn).toBe('');
    });
  });

  describe('isModification boolean guard', () => {
    it('preserves true', () => {
      expect(createEntry('posts', '', '', { isModification: true }).isModification).toBe(true);
    });

    it('preserves false', () => {
      expect(createEntry('posts', '', '', { isModification: false }).isModification).toBe(false);
    });

    it('coerces null to null', () => {
      expect(createEntry('posts', '', '', { isModification: null }).isModification).toBeNull();
    });

    it('coerces undefined to null', () => {
      expect(createEntry('posts', '', '', { isModification: undefined }).isModification).toBeNull();
    });

    it('coerces 0 to null', () => {
      // 0 is not a boolean
      expect(
        createEntry('posts', '', '', { isModification: 0 as unknown as boolean }).isModification,
      ).toBeNull();
    });

    it("coerces 'yes' to null", () => {
      expect(
        createEntry('posts', '', '', { isModification: 'yes' as unknown as boolean })
          .isModification,
      ).toBeNull();
    });
  });

  describe('mediaFiles null coercion', () => {
    it('converts null to empty array', () => {
      expect(createEntry('posts', '', '', { mediaFiles: null }).mediaFiles).toEqual([]);
    });

    it('preserves a provided array', () => {
      const files = [{ id: '1', name: 'img.png', path: '/img.png', size: 100 }];
      expect(createEntry('posts', '', '', { mediaFiles: files as never }).mediaFiles).toEqual(
        files,
      );
    });
  });
});
