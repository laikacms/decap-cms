import { matchPath } from '../netlify-lfs-client';

function makeConfig(patterns) {
  return {
    rootURL: 'https://example.com',
    makeAuthorizedRequest: jest.fn(),
    patterns,
    enabled: true,
    transformImages: false,
  };
}

describe('netlify-lfs-client', () => {
  describe('matchPath', () => {
    it('returns true when path matches a glob pattern', () => {
      const config = makeConfig(['*.jpg']);
      expect(matchPath(config, 'image.jpg')).toBe(true);
    });

    it('returns false when no pattern matches', () => {
      const config = makeConfig(['*.jpg']);
      expect(matchPath(config, 'document.pdf')).toBe(false);
    });

    it('uses matchBase:true — *.jpg matches foo/bar/image.jpg', () => {
      const config = makeConfig(['*.jpg']);
      expect(matchPath(config, 'foo/bar/image.jpg')).toBe(true);
    });

    it('returns true if any pattern in a multi-pattern array matches', () => {
      const config = makeConfig(['*.jpg', '*.png', '*.gif']);
      expect(matchPath(config, 'photo.png')).toBe(true);
    });

    it('returns false when patterns array is empty', () => {
      const config = makeConfig([]);
      expect(matchPath(config, 'image.jpg')).toBe(false);
    });

    it('returns false when path matches none of multiple patterns', () => {
      const config = makeConfig(['*.jpg', '*.png']);
      expect(matchPath(config, 'video.mp4')).toBe(false);
    });

    it('uses matchBase:true for nested paths with multi-pattern config', () => {
      const config = makeConfig(['*.pdf', '*.jpg']);
      expect(matchPath(config, 'uploads/docs/report.pdf')).toBe(true);
    });
  });
});
