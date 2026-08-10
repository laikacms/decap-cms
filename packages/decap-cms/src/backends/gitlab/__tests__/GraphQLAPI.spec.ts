import { describe, expect, it, vi } from 'vitest';

import GraphQLAPI from '@/backends/gitlab/GraphQLAPI';

type LastCommit = {
  id: string,
  authoredDate: string,
  authorName: string,
  author?: { name?: string, username?: string, publicEmail?: string },
};

/**
 * `readFilesGraphQL` is GitLab's own `BackendEntry` producer: unlike the other
 * file-backed backends it does not go through the shared `entriesByFiles`
 * helper, so the seam contract is asserted against it directly.
 *
 * The stub dispatches on the query variables: the blobs query passes `paths`,
 * the last-commits query does not.
 */
function apiWithGraphQLResponses(blobs: { id: string, data: string }[], commits: LastCommit[]) {
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
      [{ id: 'blob-a', data: '# A' }],
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
      [{ id: 'blob-a', data: '# A' }],
      [commit({ author: { username: 'ada', publicEmail: 'ada@example.com' } })],
    );

    const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md', id: 'sha-a' }]);

    expect(entry.file.author).toEqual({ name: 'ada', id: 'ada' });
  });

  it('falls back to the public email, then to the raw commit author name', async () => {
    const byEmail = apiWithGraphQLResponses(
      [{ id: 'blob-a', data: '# A' }],
      [commit({ authorName: '', author: { publicEmail: 'ada@example.com' } })],
    );
    const byCommitName = apiWithGraphQLResponses(
      [{ id: 'blob-a', data: '# A' }],
      [commit({ authorName: 'Ada from the commit' })],
    );

    const [viaEmail] = await byEmail.readFilesGraphQL([{ path: 'posts/a.md' }]);
    const [viaCommitName] = await byCommitName.readFilesGraphQL([{ path: 'posts/a.md' }]);

    expect(viaEmail.file.author?.name).toBe('ada@example.com');
    expect(viaCommitName.file.author?.name).toBe('Ada from the commit');
  });

  it('omits the author when the commit names nobody, rather than reporting a blank name', async () => {
    const api = apiWithGraphQLResponses(
      [{ id: 'blob-a', data: '# A' }],
      [commit({ authorName: '' })],
    );

    const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md', id: 'sha-a' }]);

    expect(entry.file).not.toHaveProperty('author');
    expect(entry.file.updatedOn).toBe('2026-01-02T03:04:05Z');
  });

  it('omits the author id when GitLab has no username for the commit author', async () => {
    const api = apiWithGraphQLResponses(
      [{ id: 'blob-a', data: '# A' }],
      [commit({ author: { name: 'Ada Lovelace' } })],
    );

    const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md' }]);

    expect(entry.file.author).toEqual({ name: 'Ada Lovelace' });
  });

  it('omits the file id when the caller did not supply one', async () => {
    const api = apiWithGraphQLResponses([{ id: 'blob-a', data: '# A' }], [commit()]);

    const [entry] = await api.readFilesGraphQL([{ path: 'posts/a.md' }]);

    expect(entry.file).not.toHaveProperty('id');
  });
});
