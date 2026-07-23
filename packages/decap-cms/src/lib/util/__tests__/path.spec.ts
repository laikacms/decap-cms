import { describe, expect, it } from 'vitest';

import {
  basename,
  dirname,
  extname,
  fileExtension,
  fileExtensionWithSeparator,
  isAbsolutePath,
  join,
} from '@/lib/util/core-utils/path.js';

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

describe('join', () => {
  it('should join and resolve .. segments for an absolute path', () => {
    expect(join('/foo', 'bar', 'baz/asdf', 'quux', '..')).toEqual('/foo/bar/baz/asdf');
  });

  it('should join a relative path without resolving anything', () => {
    expect(join('foo', 'bar', 'baz')).toEqual('foo/bar/baz');
  });

  it('should skip . segments for a relative path', () => {
    expect(join('.', 'foo', '.', 'bar')).toEqual('foo/bar');
  });

  it('should skip . segments for an absolute path', () => {
    expect(join('/foo', '.', 'bar')).toEqual('/foo/bar');
  });

  it('should keep a leading .. for a relative path that cannot go up further', () => {
    expect(join('..', 'foo')).toEqual('../foo');
  });

  it('should ignore .. at the root of an absolute path', () => {
    expect(join('/', '..')).toEqual('/');
  });

  it('should return "." when called with no arguments', () => {
    expect(join()).toEqual('.');
  });

  it('should return "." when called with only empty strings', () => {
    expect(join('', '')).toEqual('.');
  });
});

describe('basename', () => {
  it('should return the last portion of a path', () => {
    expect(basename('/foo/bar/baz/asdf/quux.html')).toEqual('quux.html');
  });

  it('should return the last portion of a path with the extension stripped', () => {
    expect(basename('/foo/bar/baz/asdf/quux.html', '.html')).toEqual('quux');
  });

  it('should return the directory name when the path has a trailing slash', () => {
    expect(basename('/foo/bar/')).toEqual('bar');
  });

  it('should return an empty string for the root path', () => {
    expect(basename('/')).toEqual('');
  });

  it('should return an empty string for an empty path', () => {
    expect(basename('')).toEqual('');
  });

  it('should return the path unchanged when there is no separator', () => {
    expect(basename('foo')).toEqual('foo');
  });
});

describe('dirname', () => {
  it('should return the directory name of a path', () => {
    expect(dirname('/foo/bar/baz/asdf/quux')).toEqual('/foo/bar/baz/asdf');
  });

  it('should strip a trailing slash before computing the directory name', () => {
    expect(dirname('/foo/bar/')).toEqual('/foo');
  });

  it('should return "/" for the root path', () => {
    expect(dirname('/')).toEqual('/');
  });

  it('should return "." when the path has no separator', () => {
    expect(dirname('foo')).toEqual('.');
  });

  it('should return "." for an empty path', () => {
    expect(dirname('')).toEqual('.');
  });
});

describe('isAbsolutePath', () => {
  it('should return true for a POSIX absolute path', () => {
    expect(isAbsolutePath('/foo/bar')).toEqual(true);
  });

  it('should return false for a POSIX relative path', () => {
    expect(isAbsolutePath('foo/bar')).toEqual(false);
  });

  it('should return true for a URL with a scheme', () => {
    expect(isAbsolutePath('https://example.com/foo')).toEqual(true);
  });

  it('should return true for a protocol-relative URL', () => {
    expect(isAbsolutePath('//example.com/foo')).toEqual(true);
  });

  it('should return false for a scheme without a double slash', () => {
    expect(isAbsolutePath('mailto:foo@bar.com')).toEqual(false);
  });

  it('should return false for an empty path', () => {
    expect(isAbsolutePath('')).toEqual(false);
  });
});

describe('extname', () => {
  it('should return the extension of a file', () => {
    expect(extname('index.html')).toEqual('.html');
  });

  it('should return the extension of the last path segment of a URL', () => {
    expect(extname('https://example.com/path/to/file.json')).toEqual('.json');
  });

  it('should extract an extension-shaped suffix from a bare host (no special URL handling)', () => {
    expect(extname('https://example.com')).toEqual('.com');
  });

  it('should return an empty string if the file has no extension', () => {
    expect(extname('noext')).toEqual('');
  });

  it('should return an empty string for a dotfile with no other "."', () => {
    expect(extname('.hidden')).toEqual('');
  });
});
