import { print } from 'graphql';

import { lastCommits } from '../queries';

describe('queries', () => {
  describe('lastCommits', () => {
    it('produces one aliased tree block for a single path', () => {
      const query = print(lastCommits(['content/posts/foo.md']));

      expect(query).toContain('tree0: tree(ref: $branch, path: "content/posts/foo.md")');
      expect(query).toContain('lastCommit');
      expect(query).toContain('authorName');
      expect(query).toContain('authoredDate');
    });

    it('produces one aliased tree block per path for multiple paths', () => {
      const paths = ['content/posts/foo.md', 'content/posts/bar.md', 'content/posts/baz.md'];
      const query = print(lastCommits(paths));

      paths.forEach((path, index) => {
        expect(query).toContain(`tree${index}: tree(ref: $branch, path: "${path}")`);
      });
    });

    it('produces a valid query with no tree blocks for an empty paths array', () => {
      expect(() => lastCommits([])).not.toThrow();

      const query = print(lastCommits([]));

      expect(query).not.toContain('tree(ref: $branch');
      expect(query).toContain('query lastCommits($repo: ID!, $branch: String!)');
    });
  });
});
