import { pathTraversal } from './customValidators';

const repoPath = '/tmp/repo';

describe('pathTraversal', () => {
  it('passes for a normal relative path inside the repo', () => {
    const schema = pathTraversal(repoPath);
    const { error } = schema.validate('content/post.md');
    expect(error).toBeUndefined();
  });

  it('fails for a traversal path that escapes the repo', () => {
    const schema = pathTraversal(repoPath);
    const { error } = schema.validate('../../etc/passwd');
    expect(error).not.toBeUndefined();
    expect(error!.details[0].message).toBe(
      '"value" must resolve to a path under the configured repository',
    );
  });

  it('fails for a path that starts with repoPath as prefix but resolves outside', () => {
    // /tmp/repo + ../repo-sibling/file resolves to /tmp/repo-sibling/file
    // which starts with /tmp/repo but is outside the repo
    const schema = pathTraversal(repoPath);
    const { error } = schema.validate('../repo-sibling/file');
    expect(error).not.toBeUndefined();
    expect(error!.details[0].message).toBe(
      '"value" must resolve to a path under the configured repository',
    );
  });

  it('fails for an absolute traversal path that resolves outside the repo', () => {
    // path.join with an absolute second argument discards the first — still escapes
    const schema = pathTraversal(repoPath);
    const { error } = schema.validate('subdir/../../etc/passwd');
    expect(error).not.toBeUndefined();
    expect(error!.details[0].message).toBe(
      '"value" must resolve to a path under the configured repository',
    );
  });
});
