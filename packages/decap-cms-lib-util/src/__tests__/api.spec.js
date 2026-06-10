import * as api from '../API';

describe('Api', () => {
  describe('getPreviewStatus', () => {
    it('should return preview status on matching context', () => {
      expect(api.getPreviewStatus([{ context: 'deploy' }])).toEqual({ context: 'deploy' });
    });

    it('should return undefined on matching context', () => {
      expect(api.getPreviewStatus([{ context: 'other' }])).toBeUndefined();
    });
  });

  describe('parseResponse', () => {
    it('should resolve parsed JSON for JSON content-type', async () => {
      const data = { foo: 'bar' };
      const response = {
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(data),
      };
      await expect(api.parseResponse(response)).resolves.toEqual(data);
    });

    it('should resolve text for text content-type when ok', async () => {
      const response = {
        ok: true,
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('hello'),
      };
      await expect(api.parseResponse(response)).resolves.toBe('hello');
    });

    it('should reject with body text for text content-type when not ok', async () => {
      const response = {
        ok: false,
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('error message'),
      };
      await expect(api.parseResponse(response)).rejects.toBe('error message');
    });
  });

  describe('isPreviewContext', () => {
    it('should return true when context exactly matches previewContext', () => {
      expect(
        api.isPreviewContext('netlify/my-site/deploy-preview', 'netlify/my-site/deploy-preview'),
      ).toBe(true);
    });

    it('should return false when context does not match previewContext', () => {
      expect(
        api.isPreviewContext('netlify/my-site/deploy-preview', 'netlify/other-site/deploy-preview'),
      ).toBe(false);
    });

    it('should return true when no previewContext and context includes a keyword', () => {
      expect(api.isPreviewContext('deploy-preview', '')).toBe(true);
    });

    it('should return false when no previewContext and context does not include any keyword', () => {
      expect(api.isPreviewContext('ci/build', '')).toBe(false);
    });
  });
});
