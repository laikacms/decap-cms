import { afterEach, describe, expect, it, vi } from 'vitest';

import GraphQLAPI from '@/backends/gitlab/GraphQLAPI';

type LastCommit = {
  id: string,
  authoredDate: string,
  authorName: string,
  author?: { name?: string, username?: string, publicEmail?: string },
};

type Blob = { id: string, path: string, data: string };

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * `readFilesGraphQL` is GitLab's own `BackendEntry` producer: unlike the other
 * file-backed backends it does not go through the shared `entriesByFiles`
 * helper, so the seam contract is asserted against it directly.
 *
 * The stub dispatches on the query variables: the blobs query passes `paths`,
 * the last-commits query does not. `commits` is indexed by the `tree<n>` alias
 * the last-commits query builds, so it lines up with the requested paths; a
 * `null` entry is a tree GitLab reports no last commit for.
 */
function apiWithGraphQLResponses(blobs: Blob[], commits: (LastCommit | null)[]) {
  const api = new GraphQLAPI({ repo: 'owner/repo', branch: 'main' });

  api.graphQLClient = {
    query: vi.fn(({ variables }: { variables: Record<string, unknown> }) => {
      if ('paths' in variables) {
        return Promise.resolve({ data: { project: { repository: { blobs: { nodes: blobs } } } } });
      }
      return Promise.resolve({
        data: {
          project: {
            repository: Object.fromEntries(
              commits.map((lastCommit, index) => [`tree${index}`, { lastCommit }]),
            ),
          },
        },
      });
    }),
  } as never;

  return api;
}

function commit(overrides: Partial<LastCommit> = {}): LastCommit {
  return {
    id: 'commit-sha',
    authoredDate: '2026-01-02T03:04:05Z',
    authorName: 'Ada Lovelace',
    ...overrides,
  };
}

describe('gitlab readFilesGraphQL', () => {
  it('returns file text as raw content with a structured author', async () => {
    const api = apiWithGraphQLResponses(
      [{ id: 'blob-a', path: 'posts/a.md', data: '# A' }],
      [commit({ author: { name: 'Ada Lovelace', username: 'ada', publicEmail: 'ada@example.com' } })],
    );

    await expect(api.readFilesGraphQL([{ path: 'posts/a.md', id: 'sha-a' }])).resolves.toEqual([
      {
        file: {
          path: 'posts/a.md',
          id: 'sha-a',
          author: { name: 'Ada Lovelace', id: 'ada' },
          updatedOn: '2026-01-02T03:04:05Z',
        },
        content: { kind: 'raw', raw: '# A' },
      },
    ]);
  });

  it('prefers the username over the display name when there is no display name', async () => {
    const api = apiWithGraphQLResponses(
      [{ id: 'blob-a', path: 'posts/a.md', data: '# A' }],
      [commit({ author: { username: 'ada', publicEmail: 'ada@example.com' } })],
    );

    const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md', id: 'sha-a' }]);

    expect(entry.file.author).toEqual({ name: 'ada', id: 'ada' });
  });

  it('falls back to the public email, then to the raw commit author name', async () => {
    const byEmail = apiWithGraphQLResponses(
      [{ id: 'blob-a', path: 'posts/a.md', data: '# A' }],
      [commit({ authorName: '', author: { publicEmail: 'ada@example.com' } })],
    );
    const byCommitName = apiWithGraphQLResponses(
      [{ id: 'blob-a', path: 'posts/a.md', data: '# A' }],
      [commit({ authorName: 'Ada from the commit' })],
    );

    const [viaEmail] = await byEmail.readFilesGraphQL([{ path: 'posts/a.md' }]);
    const [viaCommitName] = await byCommitName.readFilesGraphQL([{ path: 'posts/a.md' }]);

    expect(viaEmail.file.author?.name).toBe('ada@example.com');
    expect(viaCommitName.file.author?.name).toBe('Ada from the commit');
  });

  it('omits the author when the commit names nobody, rather than reporting a blank name', async () => {
    const api = apiWithGraphQLResponses(
      [{ id: 'blob-a', path: 'posts/a.md', data: '# A' }],
      [commit({ authorName: '' })],
    );

    const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md', id: 'sha-a' }]);

    expect(entry.file).not.toHaveProperty('author');
    expect(entry.file.updatedOn).toBe('2026-01-02T03:04:05Z');
  });

  it('omits the author id when GitLab has no username for the commit author', async () => {
    const api = apiWithGraphQLResponses(
      [{ id: 'blob-a', path: 'posts/a.md', data: '# A' }],
      [commit({ author: { name: 'Ada Lovelace' } })],
    );

    const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md' }]);

    expect(entry.file.author).toEqual({ name: 'Ada Lovelace' });
  });

  it('omits the file id when the caller did not supply one', async () => {
    const api = apiWithGraphQLResponses(
      [{ id: 'blob-a', path: 'posts/a.md', data: '# A' }],
      [commit()],
    );

    const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md' }]);

    expect(entry.file).not.toHaveProperty('id');
  });

  /**
   * Content and authorship arrive as two independent batched responses, so
   * anything that makes either one shorter than (or ordered differently from)
   * the requested paths used to slide every later file onto its predecessor's
   * data.
   */
  describe('joining content and authorship back to the requested files', () => {
    it('keeps each file with its own content when GitLab omits a blob', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const api = apiWithGraphQLResponses(
        // No blob for posts/a.md: GitLab drops paths it cannot resolve.
        [
          { id: 'blob-b', path: 'posts/b.md', data: '# B' },
          { id: 'blob-c', path: 'posts/c.md', data: '# C' },
        ],
        [commit(), commit(), commit()],
      );

      const entries = await api.readFilesGraphQL([
        { path: 'posts/a.md' },
        { path: 'posts/b.md' },
        { path: 'posts/c.md' },
      ]);

      expect(entries.map(entry => [entry.file.path, entry.content])).toEqual([
        ['posts/a.md', { kind: 'raw', raw: '' }],
        ['posts/b.md', { kind: 'raw', raw: '# B' }],
        ['posts/c.md', { kind: 'raw', raw: '# C' }],
      ]);
    });

    it('warns rather than silently blanking an entry when a blob is missing', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const api = apiWithGraphQLResponses([], [commit()]);

      await api.readFilesGraphQL([{ path: 'posts/a.md' }]);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('posts/a.md'));
    });

    it('matches blobs by path even when GitLab returns them in another order', async () => {
      const api = apiWithGraphQLResponses(
        [
          { id: 'blob-b', path: 'posts/b.md', data: '# B' },
          { id: 'blob-a', path: 'posts/a.md', data: '# A' },
        ],
        [commit(), commit()],
      );

      const entries = await api.readFilesGraphQL([{ path: 'posts/a.md' }, { path: 'posts/b.md' }]);

      expect(entries.map(entry => [entry.file.path, entry.content.raw])).toEqual([
        ['posts/a.md', '# A'],
        ['posts/b.md', '# B'],
      ]);
    });

    it('keeps each file with its own author when a tree reports no last commit', async () => {
      const api = apiWithGraphQLResponses(
        [
          { id: 'blob-a', path: 'posts/a.md', data: '# A' },
          { id: 'blob-b', path: 'posts/b.md', data: '# B' },
          { id: 'blob-c', path: 'posts/c.md', data: '# C' },
        ],
        [
          // posts/a.md has no last commit; b and c must not shift up onto it.
          null,
          commit({ authorName: 'Author of B' }),
          commit({ authorName: 'Author of C' }),
        ],
      );

      const entries = await api.readFilesGraphQL([
        { path: 'posts/a.md' },
        { path: 'posts/b.md' },
        { path: 'posts/c.md' },
      ]);

      expect(entries.map(entry => [entry.file.path, entry.file.author?.name])).toEqual([
        ['posts/a.md', undefined],
        ['posts/b.md', 'Author of B'],
        ['posts/c.md', 'Author of C'],
      ]);
    });

    it('leaves a file without revision metadata when its tree has no last commit', async () => {
      const api = apiWithGraphQLResponses(
        [{ id: 'blob-a', path: 'posts/a.md', data: '# A' }],
        [null],
      );

      const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md', id: 'sha-a' }]);

      expect(entry.file).toEqual({ path: 'posts/a.md', id: 'sha-a' });
      expect(entry.content).toEqual({ kind: 'raw', raw: '# A' });
    });
  });
});
