export type DiffLineType = 'added' | 'removed' | 'unchanged';

export type DiffLine = {
  type: DiffLineType;
  value: string;
};

/**
 * Computes a line-based diff between two strings using the classic LCS
 * (longest common subsequence) algorithm. Used to render a diff preview of
 * pending `config.yml` edits before they're committed (DCMS-1418).
 *
 * This intentionally avoids pulling in the `diff` npm package: the config
 * editor only ever diffs a single small text file, so a dependency-free
 * O(n*m) LCS table is simple, easy to test, and fast enough at that size.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.length === 0 ? [] : oldText.split('\n');
  const newLines = newText.length === 0 ? [] : newText.split('\n');

  const oldLen = oldLines.length;
  const newLen = newLines.length;

  // lcsLengths[i][j] = length of the LCS of oldLines[i:] and newLines[j:]
  const lcsLengths: number[][] = Array.from({ length: oldLen + 1 }, () =>
    new Array(newLen + 1).fill(0),
  );

  for (let i = oldLen - 1; i >= 0; i -= 1) {
    for (let j = newLen - 1; j >= 0; j -= 1) {
      lcsLengths[i][j] =
        oldLines[i] === newLines[j]
          ? lcsLengths[i + 1][j + 1] + 1
          : Math.max(lcsLengths[i + 1][j], lcsLengths[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < oldLen && j < newLen) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: 'unchanged', value: oldLines[i] });
      i += 1;
      j += 1;
    } else if (lcsLengths[i + 1][j] >= lcsLengths[i][j + 1]) {
      result.push({ type: 'removed', value: oldLines[i] });
      i += 1;
    } else {
      result.push({ type: 'added', value: newLines[j] });
      j += 1;
    }
  }
  while (i < oldLen) {
    result.push({ type: 'removed', value: oldLines[i] });
    i += 1;
  }
  while (j < newLen) {
    result.push({ type: 'added', value: newLines[j] });
    j += 1;
  }

  return result;
}
