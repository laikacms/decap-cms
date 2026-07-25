import path from 'node:path';

export function pathTraversal(repoPath: string) {
  const repositoryRoot = path.resolve(repoPath);

  return (value: string) => {
    const relativePath = path.relative(repositoryRoot, path.resolve(repositoryRoot, value));
    const valid = relativePath !== '..'
      && !relativePath.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativePath);
    return valid ? undefined : 'must resolve to a path under the configured repository';
  };
}
