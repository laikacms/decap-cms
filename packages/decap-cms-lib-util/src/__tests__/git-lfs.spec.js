import {
  createPointerFile,
  getLargeMediaPatternsFromGitAttributesFile,
  parsePointerFile,
} from '../git-lfs';

describe('createPointerFile', () => {
  const sha = '4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393';
  const size = 12345;

  it('returns the exact expected pointer file string for known sha and size', () => {
    const result = createPointerFile({ sha, size });
    expect(result).toBe(
      `version https://git-lfs.github.com/spec/v1\noid sha256:${sha}\nsize ${size}\n`,
    );
  });

  it('includes the oid sha256: prefix', () => {
    const result = createPointerFile({ sha, size });
    expect(result).toContain(`oid sha256:${sha}`);
  });

  it('includes the size field on its own line', () => {
    const result = createPointerFile({ sha, size });
    expect(result).toContain(`\nsize ${size}\n`);
  });

  it('ends with a trailing newline', () => {
    const result = createPointerFile({ sha, size });
    expect(result.endsWith('\n')).toBe(true);
  });

  it('round-trips through parsePointerFile', () => {
    const original = { sha, size };
    const pointer = createPointerFile(original);
    const parsed = parsePointerFile(pointer);
    expect(parsed.sha).toBe(original.sha);
    expect(parsed.size).toBe(original.size);
  });
});

describe('parsePointerFile', () => {
  it('parses a valid pointer file and returns correct size and sha', () => {
    const input = [
      'version https://git-lfs.github.com/spec/v1',
      'oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393',
      'size 12345',
    ].join('\n');

    const result = parsePointerFile(input);

    expect(result.size).toBe(12345);
    expect(result.sha).toBe('4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393');
  });

  it('surfaces extra unknown keys alongside size and sha', () => {
    const input = [
      'version https://git-lfs.github.com/spec/v1',
      'oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393',
      'size 12345',
      'x-custom-key somevalue',
    ].join('\n');

    const result = parsePointerFile(input);

    expect(result.size).toBe(12345);
    expect(result.sha).toBe('4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393');
    expect(result['x-custom-key']).toBe('somevalue');
  });

  it('does not throw on empty string and returns a partial object', () => {
    expect(() => parsePointerFile('')).not.toThrow();
    const result = parsePointerFile('');
    expect(result).toBeDefined();
  });

  it('does not throw on malformed string and returns a partial object', () => {
    expect(() => parsePointerFile('not a pointer file')).not.toThrow();
    const result = parsePointerFile('not a pointer file');
    expect(result).toBeDefined();
  });
});

describe('getLargeMediaPatternsFromGitAttributesFile', () => {
  it('returns the pattern for a single LFS entry', () => {
    const input = '*.jpg filter=lfs diff=lfs merge=lfs -text\n';
    const result = getLargeMediaPatternsFromGitAttributesFile(input);
    expect(result).toEqual(['*.jpg']);
  });

  it('returns all patterns when multiple LFS entries are present', () => {
    const input = [
      '*.jpg filter=lfs diff=lfs merge=lfs -text',
      '*.png filter=lfs diff=lfs merge=lfs -text',
      '*.gif filter=lfs diff=lfs merge=lfs -text',
    ].join('\n');

    const result = getLargeMediaPatternsFromGitAttributesFile(input);
    expect(result).toEqual(['*.jpg', '*.png', '*.gif']);
  });

  it('does not return comment lines', () => {
    const input = ['# this is a comment', '*.jpg filter=lfs diff=lfs merge=lfs -text'].join('\n');

    const result = getLargeMediaPatternsFromGitAttributesFile(input);
    expect(result).toEqual(['*.jpg']);
  });

  it('does not return non-LFS attribute lines', () => {
    const input = [
      '*.md text=auto',
      '*.sh eol=lf',
      '*.jpg filter=lfs diff=lfs merge=lfs -text',
    ].join('\n');

    const result = getLargeMediaPatternsFromGitAttributesFile(input);
    expect(result).toEqual(['*.jpg']);
  });

  it('returns an empty array when there are no LFS patterns', () => {
    const input = ['# comment', '*.md text=auto'].join('\n');

    const result = getLargeMediaPatternsFromGitAttributesFile(input);
    expect(result).toEqual([]);
  });
});
