const absolutePath = new RegExp('^(?:[a-z]+:)?//|^/', 'i');

function normalizePath(path: string) {
  return path.replace(/[\\/]+/g, '/');
}

export function isAbsolutePath(path: string) {
  const result = absolutePath.test(path);
  return result;
}

/**
 * Join all arguments together and normalize the resulting path.
 * @example Usage example
 *   path.join('/foo', 'bar', 'baz/asdf', 'quux', '..')
 *   // returns
 *   '/foo/bar/baz/asdf'
 *
 *   path.join('foo', 'bar', 'baz')
 *   // returns
 *   'foo/bar/baz'
 */
export function join(...paths: string[]): string {
  if (paths.length === 0) {
    return '.';
  }

  // Filter out empty strings
  const filteredPaths = paths.filter(p => p !== '');
  if (filteredPaths.length === 0) {
    return '.';
  }

  // Join with separator and normalize
  let joined = filteredPaths.join('/');
  joined = normalizePath(joined);

  // Resolve . and .. segments
  const isAbsolute = joined.startsWith('/');
  const segments = joined.split('/');
  const resolvedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === '.' || segment === '') {
      // Skip current directory markers and empty segments (except for leading slash)
      continue;
    } else if (segment === '..') {
      // Go up one directory if possible
      if (resolvedSegments.length > 0 && resolvedSegments[resolvedSegments.length - 1] !== '..') {
        resolvedSegments.pop();
      } else if (!isAbsolute) {
        // For relative paths, keep the .. if we can't go up
        resolvedSegments.push('..');
      }
      // For absolute paths, ignore .. at root
    } else {
      resolvedSegments.push(segment);
    }
  }

  let result = resolvedSegments.join('/');
  if (isAbsolute) {
    result = '/' + result;
  }

  return result || '.';
}

/**
 * Return the last portion of a path. Similar to the Unix basename command.
 * @example Usage example
 *   path.basename('/foo/bar/baz/asdf/quux.html')
 *   // returns
 *   'quux.html'
 *
 *   path.basename('/foo/bar/baz/asdf/quux.html', '.html')
 *   // returns
 *   'quux'
 */
export function basename(p: string, ext = '') {
  // Special case: Normalize will modify this to '.'
  if (p === '') {
    return p;
  }
  // Normalize the string first to remove any weirdness.
  p = normalizePath(p);
  // Get the last part of the string.
  const sections = p.split('/');
  const lastPart = sections[sections.length - 1];
  // Special case: If it's empty, then we have a string like so: foo/
  // Meaning, 'foo' is guaranteed to be a directory.
  if (lastPart === '' && sections.length > 1) {
    return sections[sections.length - 2];
  }
  // Remove the extension, if need be.
  if (ext.length > 0) {
    const lastPartExt = lastPart.slice(-ext.length);
    if (lastPartExt === ext) {
      return lastPart.slice(0, -ext.length);
    }
  }
  return lastPart;
}

/**
 * Return the extension of the path, from the last '.' to end of string in the
 * last portion of the path. If there is no '.' in the last portion of the path
 * or the first character of it is '.', then it returns an empty string.
 * @example Usage example
 *   path.fileExtensionWithSeparator('index.html')
 *   // returns
 *   '.html'
 */
export function fileExtensionWithSeparator(p: string) {
  p = normalizePath(p);
  const sections = p.split('/');
  p = sections.pop() as string;
  // Special case: foo/file.ext/ should return '.ext'
  if (p === '' && sections.length > 0) {
    p = sections.pop() as string;
  }
  if (p === '..') {
    return '';
  }
  const i = p.lastIndexOf('.');
  if (i === -1 || i === 0) {
    return '';
  }
  return p.slice(i);
}

/**
 * Return the extension of the path, from after the last '.' to end of string in the
 * last portion of the path. If there is no '.' in the last portion of the path
 * or the first character of it is '.', then it returns an empty string.
 * @example Usage example
 *   path.fileExtension('index.html')
 *   // returns
 *   'html'
 */
export function fileExtension(p: string) {
  const ext = fileExtensionWithSeparator(p);
  return ext === '' ? ext : ext.slice(1);
}

/**
 * Alias for fileExtensionWithSeparator - returns extension with the dot.
 * @example Usage example
 *   path.extname('index.html')
 *   // returns
 *   '.html'
 */
export function extname(p: string) {
  return fileExtensionWithSeparator(p);
}

/**
 * Return the directory name of a path. Similar to the Unix dirname command.
 * @example Usage example
 *   path.dirname('/foo/bar/baz/asdf/quux')
 *   // returns
 *   '/foo/bar/baz/asdf'
 */
export function dirname(p: string) {
  // Special case: empty string
  if (p === '') {
    return '.';
  }
  // Normalize the string first to remove any weirdness.
  p = normalizePath(p);
  // Remove trailing slash
  if (p.endsWith('/') && p.length > 1) {
    p = p.slice(0, -1);
  }
  // Find the last slash
  const lastSlashIndex = p.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return '.';
  }
  if (lastSlashIndex === 0) {
    return '/';
  }
  return p.slice(0, lastSlashIndex);
}

export const pathToSegments = (path: string) => {
  const segments = path
    .split('/')
    .map(x => x.trim())
    .filter(x => x.length > 0);
  return segments;
};

export const combine = (...segments: string[]) => {
  const path = segments
    .map(x => x.trim())
    .filter(x => x.length > 0)
    .join('/');
  return path;
};

export function getPathDepth(path: string) {
  return pathToSegments(path).length;
}
