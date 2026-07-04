import { parseAzureRepo } from '../implementation';

import type { Config } from 'decap-cms-lib-util';

function configWithRepo(repo: unknown): Config {
  return {
    backend: {
      repo,
    },
  } as unknown as Config;
}

describe('parseAzureRepo', () => {
  it('returns org, project, and repoName for a valid org/project/repo string', () => {
    const config = configWithRepo('my-org/my-project/my-repo');

    expect(parseAzureRepo(config)).toEqual({
      org: 'my-org',
      project: 'my-project',
      repoName: 'my-repo',
    });
  });

  it('throws when repo is missing', () => {
    const config = configWithRepo(undefined);

    expect(() => parseAzureRepo(config)).toThrow(
      'The Azure backend needs a "repo" in the backend configuration.',
    );
  });

  it('throws when repo is not a string', () => {
    const config = configWithRepo(123);

    expect(() => parseAzureRepo(config)).toThrow(
      'The Azure backend needs a "repo" in the backend configuration.',
    );
  });

  it('throws when repo does not have exactly three segments', () => {
    const config = configWithRepo('my-org/my-repo');

    expect(() => parseAzureRepo(config)).toThrow(
      'The Azure backend must be in a the format of {org}/{project}/{repo}',
    );
  });

  it('throws when repo has more than three segments', () => {
    const config = configWithRepo('my-org/my-project/my-repo/extra');

    expect(() => parseAzureRepo(config)).toThrow(
      'The Azure backend must be in a the format of {org}/{project}/{repo}',
    );
  });
});
