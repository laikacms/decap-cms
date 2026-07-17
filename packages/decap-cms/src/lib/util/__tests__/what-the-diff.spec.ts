import { describe, expect, it } from 'vitest';

import { parse } from '@/lib/util/what-the-diff.js';

describe('parse', () => {
  it('should parse an added file', () => {
    const diff = [
      'diff --git a/new-file.txt b/new-file.txt',
      'new file mode 100644',
      'index 0000000..e69de29',
      '--- /dev/null',
      '+++ b/new-file.txt',
      '@@ -0,0 +1,2 @@',
      '+line one',
      '+line two',
      '',
    ].join('\n');

    const [fileDiff] = parse(diff);

    expect(fileDiff.status).toEqual('added');
    expect(fileDiff.oldPath).toBeNull();
    // diffHeaderLine keeps the `a/`/`b/` prefix on the trailing path; callers strip it
    // themselves (see bitbucket API.tsx's `.replace(/b\//, '')`).
    expect(fileDiff.newPath).toEqual('b/new-file.txt');
    expect(fileDiff.oldMode).toBeNull();
    expect(fileDiff.newMode).toEqual('100644');
    expect(fileDiff.binary).toBe(false);
    expect(fileDiff.hunks).toEqual([
      {
        oldStartLine: 0,
        oldLineCount: 0,
        newStartLine: 1,
        newLineCount: 2,
        heading: '',
        lines: ['+line one', '+line two'],
      },
    ]);
  });

  it('should parse a deleted file', () => {
    const diff = [
      'diff --git a/old-file.txt b/old-file.txt',
      'deleted file mode 100644',
      'index e69de29..0000000',
      '--- a/old-file.txt',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-line one',
      '-line two',
      '',
    ].join('\n');

    const [fileDiff] = parse(diff);

    expect(fileDiff.status).toEqual('deleted');
    expect(fileDiff.oldPath).toEqual('b/old-file.txt');
    expect(fileDiff.newPath).toBeNull();
    expect(fileDiff.oldMode).toEqual('100644');
    expect(fileDiff.newMode).toBeNull();
    expect(fileDiff.binary).toBe(false);
    expect(fileDiff.hunks).toEqual([
      {
        oldStartLine: 1,
        oldLineCount: 2,
        newStartLine: 0,
        newLineCount: 0,
        heading: '',
        lines: ['-line one', '-line two'],
      },
    ]);
  });

  it('should parse a modified file', () => {
    const diff = [
      'diff --git a/content/post.md b/content/post.md',
      'index 1234567..89abcde 100644',
      '--- a/content/post.md',
      '+++ b/content/post.md',
      '@@ -1,3 +1,3 @@',
      ' title: Hello',
      '-body: old body',
      '+body: new body',
      ' tags: [a, b]',
      '',
    ].join('\n');

    const [fileDiff] = parse(diff);

    expect(fileDiff.status).toEqual('modified');
    expect(fileDiff.oldPath).toEqual('b/content/post.md');
    expect(fileDiff.newPath).toEqual('b/content/post.md');
    expect(fileDiff.oldMode).toEqual('100644');
    expect(fileDiff.newMode).toEqual('100644');
    expect(fileDiff.binary).toBe(false);
    expect(fileDiff.hunks).toEqual([
      {
        oldStartLine: 1,
        oldLineCount: 3,
        newStartLine: 1,
        newLineCount: 3,
        heading: '',
        lines: [' title: Hello', '-body: old body', '+body: new body', ' tags: [a, b]'],
      },
    ]);
  });

  it('should parse a renamed file with a similarity index', () => {
    const diff = [
      'diff --git a/content/old-name.md b/content/new-name.md',
      'similarity index 95%',
      'rename from content/old-name.md',
      'rename to content/new-name.md',
      'index 1234567..89abcde 100644',
      '--- a/content/old-name.md',
      '+++ b/content/new-name.md',
      '@@ -1,1 +1,1 @@',
      '-title: Old',
      '+title: New',
      '',
    ].join('\n');

    const [fileDiff] = parse(diff);

    expect(fileDiff.status).toEqual('renamed');
    expect(fileDiff.oldPath).toEqual('content/old-name.md');
    expect(fileDiff.newPath).toEqual('content/new-name.md');
    expect(fileDiff.similarity).toEqual(95);
    expect(fileDiff.oldMode).toEqual('100644');
    expect(fileDiff.newMode).toEqual('100644');
    expect(fileDiff.hunks).toEqual([
      {
        oldStartLine: 1,
        oldLineCount: 1,
        newStartLine: 1,
        newLineCount: 1,
        heading: '',
        lines: ['-title: Old', '+title: New'],
      },
    ]);
  });

  it('should parse a copied file with a similarity index', () => {
    const diff = [
      'diff --git a/content/original.md b/content/duplicate.md',
      'similarity index 100%',
      'copy from content/original.md',
      'copy to content/duplicate.md',
      '',
    ].join('\n');

    const [fileDiff] = parse(diff);

    expect(fileDiff.status).toEqual('copied');
    expect(fileDiff.oldPath).toEqual('content/original.md');
    expect(fileDiff.newPath).toEqual('content/duplicate.md');
    expect(fileDiff.similarity).toEqual(100);
    expect(fileDiff.hunks).toEqual([]);
  });

  it('should parse a merge-conflict hunk', () => {
    const diff = [
      'diff --cc content/conflict.md',
      'index 1234567,89abcde..0000000',
      '--- a/content/conflict.md',
      '+++ b/content/conflict.md',
      '@@@ -1,3 -1,3 +1,5 @@@',
      '  title: Conflict',
      '++<<<<<<< HEAD',
      '+ body: our body',
      '++=======',
      '+ body: their body',
      '++>>>>>>> branch',
      '',
    ].join('\n');

    const [fileDiff] = parse(diff);

    expect(fileDiff.status).toEqual('unmerged');
    expect(fileDiff.filePath).toEqual('content/conflict.md');
    expect(fileDiff.binary).toBe(false);
    expect(fileDiff.hunks).toEqual([
      {
        ourStartLine: 1,
        ourLineCount: 3,
        baseStartLine: 1,
        baseLineCount: 3,
        theirStartLine: 1,
        theirLineCount: 5,
        heading: '',
        lines: [
          '  title: Conflict',
          '++<<<<<<< HEAD',
          '+ body: our body',
          '++=======',
          '+ body: their body',
          '++>>>>>>> branch',
        ],
      },
    ]);
  });

  it('should parse an unmerged path with no patch', () => {
    const diff = '* Unmerged path content/conflict.md\n';

    const [fileDiff] = parse(diff);

    expect(fileDiff.status).toEqual('unmerged');
    expect(fileDiff.filePath).toEqual('content/conflict.md');
    expect(fileDiff.binary).toBe(false);
    expect(fileDiff.hunks).toBeUndefined();
  });

  it('should parse multiple file diffs from a single input', () => {
    const diff = [
      'diff --git a/added.txt b/added.txt',
      'new file mode 100644',
      'index 0000000..e69de29',
      '--- /dev/null',
      '+++ b/added.txt',
      '@@ -0,0 +1,1 @@',
      '+hello',
      'diff --git a/removed.txt b/removed.txt',
      'deleted file mode 100644',
      'index e69de29..0000000',
      '--- a/removed.txt',
      '+++ /dev/null',
      '@@ -1,1 +0,0 @@',
      '-hello',
      '',
    ].join('\n');

    const diffs = parse(diff);

    expect(diffs).toHaveLength(2);
    expect(diffs[0].status).toEqual('added');
    expect(diffs[1].status).toEqual('deleted');
  });

  it('should return an empty array for empty input', () => {
    expect(parse('')).toEqual([]);
  });
});
