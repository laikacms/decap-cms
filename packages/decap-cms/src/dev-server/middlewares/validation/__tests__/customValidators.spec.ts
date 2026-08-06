import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { pathTraversal } from '@/dev-server/middlewares/validation/customValidators';

const REJECTION_MESSAGE = 'must resolve to a path under the configured repository';

describe('pathTraversal', () => {
  const repoPath = path.resolve('/repo/root');

  it('should pass for a path that resolves inside the repo root', () => {
    const validate = pathTraversal(repoPath);

    expect(validate('content/posts/hello.md')).toBeUndefined();
  });

  it('should pass for a nested subdirectory path', () => {
    const validate = pathTraversal(repoPath);

    expect(validate('a/b/c/d.md')).toBeUndefined();
  });

  it('should pass for the repo root itself', () => {
    const validate = pathTraversal(repoPath);

    expect(validate('.')).toBeUndefined();
  });

  it('should reject the literal ".."', () => {
    const validate = pathTraversal(repoPath);

    expect(validate('..')).toBe(REJECTION_MESSAGE);
  });

  it('should reject a "../"-style escape', () => {
    const validate = pathTraversal(repoPath);

    expect(validate('../secrets.env')).toBe(REJECTION_MESSAGE);
  });

  it('should reject a deeply nested "../"-style escape', () => {
    const validate = pathTraversal(repoPath);

    expect(validate('content/../../secrets.env')).toBe(REJECTION_MESSAGE);
  });

  it('should reject an absolute path outside the repo root', () => {
    const validate = pathTraversal(repoPath);

    expect(validate(path.resolve('/etc/passwd'))).toBe(REJECTION_MESSAGE);
  });

  it('should reject a sibling directory that merely shares a string prefix with the repo root', () => {
    const validate = pathTraversal(repoPath);

    // `repoPath + '-evil'` starts with the same characters as `repoPath` but is not
    // actually a subdirectory of it; a naive `startsWith` check would wrongly accept it.
    expect(validate(`${repoPath}-evil/payload.md`)).toBe(REJECTION_MESSAGE);
  });
});
