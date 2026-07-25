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

describe('join', () => {
  it('joins relative path segments', () => {
    expect(join('foo', 'bar', 'baz')).toEqual('foo/bar/baz');
  });

  it('resolves current and parent segments in a relative path', () => {
    expect(join('foo', '.', 'bar', 'baz', '..', 'quux')).toEqual('foo/bar/quux');
  });

  it('joins absolute path segments and resolves parent segments', () => {
    expect(join('/foo', 'bar', 'baz/asdf', 'quux', '..')).toEqual('/foo/bar/baz/asdf');
  });

  it('does not resolve parent segments above the root of an absolute path', () => {
    expect(join('/foo', '..', '..', 'bar')).toEqual('/bar');
  });
});

describe('basename', () => {
  it('returns the last portion of a path with a trailing slash', () => {
    expect(basename('/foo/bar/')).toEqual('bar');
  });

  it('returns an empty string for the root path', () => {
    expect(basename('/')).toEqual('');
  });

  it('removes the supplied extension', () => {
    expect(basename('/foo/bar/quux.html', '.html')).toEqual('quux');
  });
});

describe('dirname', () => {
  it('returns the parent of a path with a trailing slash', () => {
    expect(dirname('/foo/bar/')).toEqual('/foo');
  });

  it('returns the root for a path directly below it', () => {
    expect(dirname('/foo')).toEqual('/');
  });

  it('returns the root for the root path', () => {
    expect(dirname('/')).toEqual('/');
  });
});

describe('isAbsolutePath', () => {
  it('recognizes POSIX absolute paths', () => {
    expect(isAbsolutePath('/foo/bar')).toBe(true);
    expect(isAbsolutePath('foo/bar')).toBe(false);
  });

  it('recognizes URL-scheme paths', () => {
    expect(isAbsolutePath('https://example.com/foo')).toBe(true);
    expect(isAbsolutePath('file://example.com/foo')).toBe(true);
  });
});

describe('extname', () => {
  it('returns the extension of a POSIX path', () => {
    expect(extname('/foo/bar/index.html')).toEqual('.html');
  });

  it('returns the extension of a URL-scheme path', () => {
    expect(extname('https://example.com/foo/index.html')).toEqual('.html');
  });

  it('returns an empty string when the path has no extension', () => {
    expect(extname('/foo/bar/index')).toEqual('');
  });
});

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
