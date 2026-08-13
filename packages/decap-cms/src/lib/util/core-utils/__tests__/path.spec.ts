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

describe('isAbsolutePath', () => {
  it('should return true for a path starting with a slash', () => {
    expect(isAbsolutePath('/foo/bar')).toBe(true);
  });

  it('should return true for a URL with a scheme', () => {
    expect(isAbsolutePath('https://example.com/foo')).toBe(true);
    expect(isAbsolutePath('file:///foo/bar')).toBe(true);
  });

  it('should return false for a relative path', () => {
    expect(isAbsolutePath('foo/bar')).toBe(false);
    expect(isAbsolutePath('./foo/bar')).toBe(false);
    expect(isAbsolutePath('../foo')).toBe(false);
  });
});

describe('join', () => {
  it('should join relative segments with a separator', () => {
    expect(join('foo', 'bar', 'baz')).toBe('foo/bar/baz');
  });

  it('should preserve a leading slash for absolute paths', () => {
    expect(join('/foo', 'bar', 'baz')).toBe('/foo/bar/baz');
  });

  it('should resolve .. segments against preceding segments', () => {
    expect(join('/foo', 'bar', 'baz/asdf', 'quux', '..')).toBe('/foo/bar/baz/asdf');
  });

  it('should collapse . segments', () => {
    expect(join('foo', '.', 'bar')).toBe('foo/bar');
    expect(join('.', 'foo', 'bar')).toBe('foo/bar');
  });

  it('should keep a leading .. for a relative path that cannot go further up', () => {
    expect(join('..', 'foo')).toBe('../foo');
    expect(join('a', '..', '..', 'b')).toBe('../b');
  });

  it('should drop a .. at the root of an absolute path', () => {
    expect(join('/', '..', 'foo')).toBe('/foo');
    expect(join('/foo', '..', '..')).toBe('/');
  });

  it('should return "." when called with no arguments or only empty/dot segments', () => {
    expect(join()).toBe('.');
    expect(join('')).toBe('.');
    expect(join('.', '.')).toBe('.');
  });

  it('should normalize backslashes and duplicate slashes', () => {
    expect(join('foo//bar', 'baz')).toBe('foo/bar/baz');
  });
});

describe('basename', () => {
  it('should return the last path segment', () => {
    expect(basename('/foo/bar/baz/asdf/quux.html')).toBe('quux.html');
  });

  it('should strip a matching extension when given one', () => {
    expect(basename('/foo/bar/baz/asdf/quux.html', '.html')).toBe('quux');
  });

  it('should not strip the extension when it does not match', () => {
    expect(basename('/foo/quux.html', '.js')).toBe('quux.html');
  });

  it('should return the parent segment for a path with a trailing slash', () => {
    expect(basename('/foo/bar/')).toBe('bar');
  });

  it('should return an empty string for an empty path', () => {
    expect(basename('')).toBe('');
  });

  it('should return the whole string when there is no separator', () => {
    expect(basename('quux.html')).toBe('quux.html');
  });
});

describe('dirname', () => {
  it('should return everything before the last path segment', () => {
    expect(dirname('/foo/bar/baz/asdf/quux')).toBe('/foo/bar/baz/asdf');
  });

  it('should return "/" for a path directly under the root', () => {
    expect(dirname('/foo')).toBe('/');
  });

  it('should return "." for a bare filename with no separator', () => {
    expect(dirname('foo.txt')).toBe('.');
  });

  it('should return "." for an empty string', () => {
    expect(dirname('')).toBe('.');
  });

  it('should ignore a trailing slash before computing the parent', () => {
    expect(dirname('/foo/bar/')).toBe('/foo');
  });
});

describe('fileExtensionWithSeparator / extname', () => {
  it('should return the extension including the dot', () => {
    expect(fileExtensionWithSeparator('index.html')).toBe('.html');
    expect(extname('index.html')).toBe('.html');
  });

  it('should return an empty string when there is no dot', () => {
    expect(fileExtensionWithSeparator('README')).toBe('');
  });

  it('should return an empty string for a dotfile whose name starts with a dot', () => {
    expect(fileExtensionWithSeparator('.gitignore')).toBe('');
  });

  it('should only look at the last path segment', () => {
    expect(fileExtensionWithSeparator('foo.tar/bar')).toBe('');
  });

  it('should handle a trailing slash by looking at the directory name itself', () => {
    expect(fileExtensionWithSeparator('foo/file.ext/')).toBe('.ext');
  });

  it('should return an empty string for a path ending in ".."', () => {
    expect(fileExtensionWithSeparator('foo/..')).toBe('');
  });

  it('should use the last dot when there are multiple', () => {
    expect(fileExtensionWithSeparator('archive.tar.gz')).toBe('.gz');
  });
});

describe('fileExtension', () => {
  it('should return the extension without the dot', () => {
    expect(fileExtension('index.html')).toBe('html');
  });

  it('should return an empty string when there is no extension', () => {
    expect(fileExtension('README')).toBe('');
    expect(fileExtension('.gitignore')).toBe('');
  });
});
