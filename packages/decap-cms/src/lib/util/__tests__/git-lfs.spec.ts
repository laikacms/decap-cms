import { describe, expect, it } from 'vitest';

import { createPointerFile, getLargeMediaPatternsFromGitAttributesFile, parsePointerFile } from '@/lib/util/git-lfs.js';

describe('parsePointerFile', () => {
  it('parses a valid pointer file', () => {
    const pointer = [
      'version https://git-lfs.github.com/spec/v1',
      'oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2fa',
      'size 12345',
      '',
    ].join('\n');

    expect(parsePointerFile(pointer)).toEqual({
      size: 12345,
      sha: '4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2fa',
      version: 'https://git-lfs.github.com/spec/v1',
    });
  });

  it('returns undefined sha when the oid line is missing', () => {
    const pointer = ['version https://git-lfs.github.com/spec/v1', 'size 12345', ''].join('\n');

    const result = parsePointerFile(pointer);

    expect(result.sha).toBeUndefined();
    expect(result.size).toEqual(12345);
  });

  it('returns undefined sha for a malformed oid missing the colon separator', () => {
    const pointer = [
      'version https://git-lfs.github.com/spec/v1',
      'oid sha256-4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2fa',
      'size 12345',
      '',
    ].join('\n');

    expect(parsePointerFile(pointer).sha).toBeUndefined();
  });

  it('returns NaN size when the size line is missing', () => {
    const pointer = [
      'version https://git-lfs.github.com/spec/v1',
      'oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2fa',
      '',
    ].join('\n');

    expect(Number.isNaN(parsePointerFile(pointer).size)).toBe(true);
  });
});

describe('createPointerFile', () => {
  it('creates a pointer file string containing the version, oid and size', () => {
    const pointer = createPointerFile({
      size: 42,
      sha: '4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2fa',
    });

    expect(pointer).toEqual(
      [
        'version https://git-lfs.github.com/spec/v1',
        'oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2fa',
        'size 42',
        '',
      ].join('\n'),
    );
  });

  it('round-trips through parsePointerFile', () => {
    const original = {
      size: 98765,
      sha: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567',
    };

    const pointerFileString = createPointerFile(original);
    const parsed = parsePointerFile(pointerFileString);

    expect(parsed.size).toEqual(original.size);
    expect(parsed.sha).toEqual(original.sha);
  });
});

describe('getLargeMediaPatternsFromGitAttributesFile', () => {
  it('includes patterns marked with filter=lfs diff=lfs merge=lfs', () => {
    const gitattributes = '*.psd filter=lfs diff=lfs merge=lfs -text';

    expect(getLargeMediaPatternsFromGitAttributesFile(gitattributes)).toEqual(['*.psd']);
  });

  it('excludes patterns that are not marked as lfs', () => {
    const gitattributes = '*.md text\n*.png filter=lfs diff=lfs merge=lfs -text';

    expect(getLargeMediaPatternsFromGitAttributesFile(gitattributes)).toEqual(['*.png']);
  });

  it('excludes patterns missing one of the required lfs attributes', () => {
    const gitattributes = '*.zip filter=lfs diff=lfs -text';

    expect(getLargeMediaPatternsFromGitAttributesFile(gitattributes)).toEqual([]);
  });

  it('ignores comment lines', () => {
    const gitattributes = [
      '# this is a comment',
      '*.psd filter=lfs diff=lfs merge=lfs -text',
      '# *.png filter=lfs diff=lfs merge=lfs -text',
    ].join('\n');

    expect(getLargeMediaPatternsFromGitAttributesFile(gitattributes)).toEqual(['*.psd']);
  });

  it('strips trailing comments from a pattern line', () => {
    const gitattributes = '*.psd filter=lfs diff=lfs merge=lfs -text # large binary asset';

    expect(getLargeMediaPatternsFromGitAttributesFile(gitattributes)).toEqual(['*.psd']);
  });

  it('treats a negated (leading hyphen) attribute as false and excludes the pattern', () => {
    const gitattributes = '*.psd filter=lfs diff=lfs -merge -text';

    expect(getLargeMediaPatternsFromGitAttributesFile(gitattributes)).toEqual([]);
  });
});
