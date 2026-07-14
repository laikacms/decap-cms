import path from 'node:path';
import { z } from 'zod';

export function pathTraversal(repoPath: string) {
  const repositoryRoot = path.resolve(repoPath);

  return z.string().refine(
    value => {
      const relativePath = path.relative(repositoryRoot, path.resolve(repositoryRoot, value));
      return (
        relativePath !== '..' &&
        !relativePath.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relativePath)
      );
    },
    { message: 'must resolve to a path under the configured repository' },
  );
}
