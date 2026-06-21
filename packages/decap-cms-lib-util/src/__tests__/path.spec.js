import { fileExtensionWithSeparator, fileExtension, isAbsolutePath, basename } from '../path';

describe('fileExtensionWithSeparator', () => {
  it('should return the extension of a file', () => {
    expect(fileExtensionWithSeparator('index.html')).toEqual('.html');
  });

  it('should return the extension of a file path', () => {
    expect(fileExtensionWithSeparator('/src/main/index.html')).toEqual('.html');
  });

  it('should return the extension of a file path with trailing slash', () => {
    expect(fileExtensionWithSeparator('/src/main/index.html/')).toEqual('.html');
  });

  it('should return the extension for an extension with two ..', () => {
    expect(fileExtensionWithSeparator('/src/main/index..html')).toEqual('.html');
  });

  it('should return an empty string for the parent path ..', () => {
    expect(fileExtensionWithSeparator('..')).toEqual('');
  });

  it('should return an empty string if the file has no extension', () => {
    expect(fileExtensionWithSeparator('/src/main/index')).toEqual('');
  });
});

describe('fileExtension', () => {
  it('should return the extension of a file', () => {
    expect(fileExtension('index.html')).toEqual('html');
  });

  it('should return the extension of a file path', () => {
    expect(fileExtension('/src/main/index.html')).toEqual('html');
  });

  it('should return the extension of a file path with trailing slash', () => {
    expect(fileExtension('/src/main/index.html/')).toEqual('html');
  });

  it('should return the extension for an extension with two ..', () => {
    expect(fileExtension('/src/main/index..html')).toEqual('html');
  });

  it('should return an empty string for the parent path ..', () => {
    expect(fileExtension('..')).toEqual('');
  });

  it('should return an empty string if the file has no extension', () => {
    expect(fileExtension('/src/main/index')).toEqual('');
  });
});

describe('isAbsolutePath', () => {
  it('should return true for a https URL', () => {
    expect(isAbsolutePath('https://example.com')).toBe(true);
  });

  it('should return true for a path starting with /', () => {
    expect(isAbsolutePath('/foo/bar')).toBe(true);
  });

  it('should return false for a relative path', () => {
    expect(isAbsolutePath('foo/bar')).toBe(false);
  });

  it('should return false for a Windows-style path without protocol or leading slash', () => {
    expect(isAbsolutePath('C:\\foo')).toBe(false);
  });

  it('should return true for a blob:// URL', () => {
    expect(isAbsolutePath('blob://something')).toBe(true);
  });

  it('should return false for an empty string', () => {
    expect(isAbsolutePath('')).toBe(false);
  });
});

describe('basename', () => {
  it('should return the filename with extension', () => {
    expect(basename('/foo/bar/quux.html')).toEqual('quux.html');
  });

  it('should strip the given extension', () => {
    expect(basename('/foo/bar/quux.html', '.html')).toEqual('quux');
  });

  it('should handle a trailing slash and return the directory name', () => {
    expect(basename('/foo/bar/')).toEqual('bar');
  });

  it('should return an empty string for an empty input', () => {
    expect(basename('')).toEqual('');
  });

  it('should return the filename when there is no slash', () => {
    expect(basename('foo')).toEqual('foo');
  });
});
