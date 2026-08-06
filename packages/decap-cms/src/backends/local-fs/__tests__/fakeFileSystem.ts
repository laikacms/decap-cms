// A minimal in-memory stand-in for the File System Access API surface this
// backend uses, since jsdom (and Node) don't implement it. Good enough to
// exercise `fsUtils.ts` and `implementation.tsx` without a real browser.

export class FakeFileHandle {
  readonly kind = 'file' as const;
  content: BlobPart[] = [];

  constructor(public name: string, initialContent: string | Uint8Array = '') {
    this.content = [initialContent];
  }

  async getFile(): Promise<File> {
    return new File(this.content, this.name);
  }

  async createWritable() {
    const written: BlobPart[] = [];
    return {
      write: async (data: string | Blob | BufferSource) => {
        written.push(data as BlobPart);
      },
      close: async () => {
        this.content = written;
      },
    };
  }
}

export class FakeDirectoryHandle {
  readonly kind = 'directory' as const;
  children = new Map<string, FakeFileHandle | FakeDirectoryHandle>();
  permissionState: 'granted' | 'denied' | 'prompt' = 'granted';

  constructor(public name = '') {}

  async getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FakeDirectoryHandle> {
    const existing = this.children.get(name);
    if (existing instanceof FakeDirectoryHandle) {
      return existing;
    }
    if (existing) {
      throw new Error(`${name} is a file, not a directory`);
    }
    if (options?.create) {
      const dir = new FakeDirectoryHandle(name);
      this.children.set(name, dir);
      return dir;
    }
    throw notFound(name);
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FakeFileHandle> {
    const existing = this.children.get(name);
    if (existing instanceof FakeFileHandle) {
      return existing;
    }
    if (existing) {
      throw new Error(`${name} is a directory, not a file`);
    }
    if (options?.create) {
      const file = new FakeFileHandle(name);
      this.children.set(name, file);
      return file;
    }
    throw notFound(name);
  }

  async removeEntry(name: string, _options?: { recursive?: boolean }): Promise<void> {
    if (!this.children.has(name)) {
      throw notFound(name);
    }
    this.children.delete(name);
  }

  async *entries(): AsyncGenerator<[string, FakeFileHandle | FakeDirectoryHandle]> {
    for (const [name, handle] of this.children) {
      yield [name, handle];
    }
  }

  async queryPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    return this.permissionState;
  }

  async requestPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    return this.permissionState;
  }
}

function notFound(name: string): DOMException {
  return new DOMException(`${name} not found`, 'NotFoundError');
}

/** Builds a `FakeDirectoryHandle` tree from a flat `{ 'path/to/file.md': content }` map. */
export function buildFakeTree(files: Record<string, string>): FakeDirectoryHandle {
  const root = new FakeDirectoryHandle();
  for (const [path, content] of Object.entries(files)) {
    const segments = path.split('/');
    const fileName = segments.pop() as string;
    let dir = root;
    for (const segment of segments) {
      const existing = dir.children.get(segment);
      dir = existing instanceof FakeDirectoryHandle ? existing : (() => {
        const created = new FakeDirectoryHandle(segment);
        dir.children.set(segment, created);
        return created;
      })();
    }
    dir.children.set(fileName, new FakeFileHandle(fileName, content));
  }
  return root;
}
