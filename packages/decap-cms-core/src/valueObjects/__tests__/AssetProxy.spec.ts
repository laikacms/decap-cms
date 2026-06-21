import AssetProxy, { createAssetProxy } from '../AssetProxy';

const OBJECT_URL = 'blob:http://localhost/fake-object-url';

beforeEach(() => {
  window.URL.createObjectURL = jest.fn().mockReturnValue(OBJECT_URL);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AssetProxy constructor', () => {
  describe('branch 1: url provided', () => {
    it('stores the given url', () => {
      const proxy = new AssetProxy({
        path: 'images/photo.jpg',
        url: 'https://example.com/photo.jpg',
      });
      expect(proxy.url).toBe('https://example.com/photo.jpg');
    });

    it('toString() returns the given url', () => {
      const proxy = new AssetProxy({
        path: 'images/photo.jpg',
        url: 'https://example.com/photo.jpg',
      });
      expect(proxy.toString()).toBe('https://example.com/photo.jpg');
    });

    it('does not call createObjectURL when url is provided', () => {
      new AssetProxy({ path: 'images/photo.jpg', url: 'https://example.com/photo.jpg' });
      expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('branch 2: file provided, no url', () => {
    it('calls createObjectURL with the file', () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      new AssetProxy({ path: 'images/photo.jpg', file });
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    it('stores the object url returned by createObjectURL', () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const proxy = new AssetProxy({ path: 'images/photo.jpg', file });
      expect(proxy.url).toBe(OBJECT_URL);
    });

    it('toString() returns the object url', () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const proxy = new AssetProxy({ path: 'images/photo.jpg', file });
      expect(proxy.toString()).toBe(OBJECT_URL);
    });

    it('stores the file on fileObj', () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const proxy = new AssetProxy({ path: 'images/photo.jpg', file });
      expect(proxy.fileObj).toBe(file);
    });
  });

  describe('branch 3: neither url nor file', () => {
    it('sets url to empty string', () => {
      const proxy = new AssetProxy({ path: 'images/photo.jpg' });
      expect(proxy.url).toBe('');
    });

    it('toString() returns empty string', () => {
      const proxy = new AssetProxy({ path: 'images/photo.jpg' });
      expect(proxy.toString()).toBe('');
    });

    it('does not call createObjectURL', () => {
      new AssetProxy({ path: 'images/photo.jpg' });
      expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('stores path and field', () => {
    it('stores the path', () => {
      const proxy = new AssetProxy({
        path: 'images/photo.jpg',
        url: 'https://example.com/photo.jpg',
      });
      expect(proxy.path).toBe('images/photo.jpg');
    });

    it('stores the field when provided', () => {
      const field = { name: 'image', widget: 'image' } as never;
      const proxy = new AssetProxy({
        path: 'images/photo.jpg',
        url: 'https://example.com/photo.jpg',
        field,
      });
      expect(proxy.field).toBe(field);
    });

    it('field is undefined when omitted', () => {
      const proxy = new AssetProxy({ path: 'images/photo.jpg' });
      expect(proxy.field).toBeUndefined();
    });
  });
});

describe('createAssetProxy factory', () => {
  describe('branch 1: url provided', () => {
    it('returns an AssetProxy with the given url', () => {
      const proxy = createAssetProxy({
        path: 'images/photo.jpg',
        url: 'https://example.com/photo.jpg',
      });
      expect(proxy).toBeInstanceOf(AssetProxy);
      expect(proxy.url).toBe('https://example.com/photo.jpg');
    });

    it('toString() returns the given url', () => {
      const proxy = createAssetProxy({
        path: 'images/photo.jpg',
        url: 'https://example.com/photo.jpg',
      });
      expect(proxy.toString()).toBe('https://example.com/photo.jpg');
    });
  });

  describe('branch 2: file provided, no url', () => {
    it('returns an AssetProxy using the object url from the file', () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const proxy = createAssetProxy({ path: 'images/photo.jpg', file });
      expect(proxy).toBeInstanceOf(AssetProxy);
      expect(proxy.url).toBe(OBJECT_URL);
    });

    it('toString() returns the object url', () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const proxy = createAssetProxy({ path: 'images/photo.jpg', file });
      expect(proxy.toString()).toBe(OBJECT_URL);
    });
  });

  describe('branch 3: neither url nor file', () => {
    it('returns an AssetProxy with empty url', () => {
      const proxy = createAssetProxy({ path: 'images/photo.jpg' });
      expect(proxy).toBeInstanceOf(AssetProxy);
      expect(proxy.url).toBe('');
    });

    it('toString() returns empty string', () => {
      const proxy = createAssetProxy({ path: 'images/photo.jpg' });
      expect(proxy.toString()).toBe('');
    });
  });
});
