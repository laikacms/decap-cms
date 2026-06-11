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

  describe('readFile', () => {
    it('should return cached empty string without calling fetchContent again', async () => {
      const store = {};
      const localForage = {
        getItem: jest.fn(key => Promise.resolve(key in store ? store[key] : null)),
        setItem: jest.fn((key, value) => {
          store[key] = value;
          return Promise.resolve();
        }),
      };
      const fetchContent = jest.fn(() => Promise.resolve(''));

      const first = await api.readFile('file-id', fetchContent, localForage, true);
      expect(first).toBe('');
      expect(fetchContent).toHaveBeenCalledTimes(1);

      const second = await api.readFile('file-id', fetchContent, localForage, true);
      expect(second).toBe('');
      expect(fetchContent).toHaveBeenCalledTimes(1);
    });

    it('should fetch and cache non-empty content', async () => {
      const store = {};
      const localForage = {
        getItem: jest.fn(key => Promise.resolve(key in store ? store[key] : null)),
        setItem: jest.fn((key, value) => {
          store[key] = value;
          return Promise.resolve();
        }),
      };
      const fetchContent = jest.fn(() => Promise.resolve('hello'));

      const first = await api.readFile('file-id-2', fetchContent, localForage, true);
      expect(first).toBe('hello');
      expect(fetchContent).toHaveBeenCalledTimes(1);

      const second = await api.readFile('file-id-2', fetchContent, localForage, true);
      expect(second).toBe('hello');
      expect(fetchContent).toHaveBeenCalledTimes(1);
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
