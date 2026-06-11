import { GitLfsClient } from '../git-lfs-client';

const makeAuthorizedRequest = jest.fn();

function makeClient(patterns: string[]) {
  return new GitLfsClient(true, 'https://example.com/lfs', patterns, makeAuthorizedRequest);
}

describe('GitLfsClient.matchPath', () => {
  it('returns true when path matches a glob pattern', () => {
    const client = makeClient(['images/**']);
    expect(client.matchPath('images/photo.jpg')).toBe(true);
  });

  it('returns false when path does not match any pattern', () => {
    const client = makeClient(['images/**']);
    expect(client.matchPath('documents/report.pdf')).toBe(false);
  });

  it('matches a basename-only pattern against a nested path (matchBase: true)', () => {
    const client = makeClient(['*.png']);
    expect(client.matchPath('images/foo.png')).toBe(true);
  });

  it('returns false when patterns array is empty', () => {
    const client = makeClient([]);
    expect(client.matchPath('images/foo.png')).toBe(false);
  });

  it('returns true when path matches one of multiple patterns', () => {
    const client = makeClient(['*.jpg', '*.png', '*.gif']);
    expect(client.matchPath('assets/banner.gif')).toBe(true);
  });

  it('returns false when path does not match any of multiple patterns', () => {
    const client = makeClient(['*.jpg', '*.png']);
    expect(client.matchPath('assets/document.pdf')).toBe(false);
  });
});
