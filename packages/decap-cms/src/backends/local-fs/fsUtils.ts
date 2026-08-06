// File System Access API helpers shared by the local-fs backend. Every
// function here takes the repo-root `FileSystemDirectoryHandle` plus a
// repo-relative, `/`-separated path (the same path shape every other backend
// already works with) and does the segment-by-segment handle traversal the
// API requires.
import './types';

function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export async function requestPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  const existing = await handle.queryPermission({ mode });
  if (existing === 'granted') {
    return true;
  }

  const requested = await handle.requestPermission({ mode });
  return requested === 'granted';
}

export async function getDirectoryHandle(
  root: FileSystemDirectoryHandle,
  folderPath: string,
  options: { create?: boolean } = {},
): Promise<FileSystemDirectoryHandle> {
  let dir = root;
  for (const segment of splitPath(folderPath)) {
    dir = await dir.getDirectoryHandle(segment, options);
  }
  return dir;
}

export async function getFileHandle(
  root: FileSystemDirectoryHandle,
  filePath: string,
  options: { create?: boolean } = {},
): Promise<FileSystemFileHandle> {
  const segments = splitPath(filePath);
  const fileName = segments.pop();
  if (!fileName) {
    throw new Error(`Cannot resolve a file handle for an empty path`);
  }
  const dir = await getDirectoryHandle(root, segments.join('/'), options);
  return dir.getFileHandle(fileName, options);
}

export async function readFileAsString(
  root: FileSystemDirectoryHandle,
  filePath: string,
): Promise<string> {
  const fileHandle = await getFileHandle(root, filePath);
  const file = await fileHandle.getFile();
  return file.text();
}

export async function readFile(
  root: FileSystemDirectoryHandle,
  filePath: string,
): Promise<File> {
  const fileHandle = await getFileHandle(root, filePath);
  return fileHandle.getFile();
}

export async function writeFile(
  root: FileSystemDirectoryHandle,
  filePath: string,
  content: string | Blob | BufferSource,
): Promise<void> {
  const fileHandle = await getFileHandle(root, filePath, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(content);
  } finally {
    await writable.close();
  }
}

export async function deleteEntry(root: FileSystemDirectoryHandle, path: string): Promise<void> {
  const segments = splitPath(path);
  const name = segments.pop();
  if (!name) {
    return;
  }
  const dir = await getDirectoryHandle(root, segments.join('/'));
  await dir.removeEntry(name, { recursive: true }).catch(err => {
    // Deleting an already-missing entry is a no-op for every other backend's
    // deleteFiles contract; a NotFoundError here means the caller's view of
    // the tree was already correct.
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return;
    }
    throw err;
  });
}

/**
 * Recursively lists repo-relative file paths under `folder`, filtered by
 * `extension` (no filtering when empty) and bounded by `depth` — mirrors the
 * `entriesByFolder` contract every git-style backend implements.
 */
export async function listFiles(
  root: FileSystemDirectoryHandle,
  folder: string,
  extension: string,
  depth: number,
): Promise<string[]> {
  if (depth <= 0) {
    return [];
  }

  let dir: FileSystemDirectoryHandle;
  try {
    dir = await getDirectoryHandle(root, folder);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return [];
    }
    throw err;
  }

  const paths: string[] = [];
  for await (const [name, entryHandle] of dir.entries()) {
    const entryPath = folder ? `${folder}/${name}` : name;
    if (entryHandle.kind === 'directory') {
      const nested = await listFiles(root, entryPath, extension, depth - 1);
      paths.push(...nested);
    } else if (!extension || name.endsWith(`.${extension}`)) {
      paths.push(entryPath);
    }
  }
  return paths;
}
