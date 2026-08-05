/**
 * A minimal line-based diff, purpose-built for the config editor's "diff
 * preview before save" step (DCMS-1418). Deliberately not a general-purpose
 * diff library: it only needs to render an unchanged/added/removed line list
 * for two whole-file strings, so a plain LCS over lines is enough and avoids
 * adding a new dependency for one screen.
 */

export type DiffLineType = 'unchanged' | 'added' | 'removed';

export interface DiffLine {
  type: DiffLineType;
  value: string;
  /** 1-based line number in the original text; absent for added lines. */
  oldLineNumber?: number;
  /** 1-based line number in the new text; absent for removed lines. */
  newLineNumber?: number;
}

/**
 * Splits on `\n` without dropping a trailing empty line's significance:
 * `"a\nb"` -> `['a', 'b']`, `"a\nb\n"` -> `['a', 'b', '']`. Both inputs are
 * split the same way, so a real trailing-newline difference still surfaces
 * as an added/removed empty final line.
 */
function toLines(text: string): string[] {
  return text.split('\n');
}

/**
 * Longest common subsequence of two line arrays, computed via the standard
 * O(n*m) DP table. Config files are short enough (typically well under a
 * thousand lines) that this is fine without a smarter algorithm.
 */
function longestCommonSubsequence(oldLines: string[], newLines: string[]): number[][] {
  const rows = oldLines.length + 1;
  const cols = newLines.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  return table;
}

/**
 * Produces a unified-style list of diff lines (unchanged/added/removed) for
 * two full-text strings, in document order.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  if (oldText === newText) {
    return toLines(oldText).map((value, index) => ({
      type: 'unchanged',
      value,
      oldLineNumber: index + 1,
      newLineNumber: index + 1,
    }));
  }

  const oldLines = toLines(oldText);
  const newLines = toLines(newText);
  const table = longestCommonSubsequence(oldLines, newLines);

  const result: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  // Walk the DP table backwards from the bottom-right corner, then reverse.
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'unchanged', value: oldLines[i - 1], oldLineNumber: i, newLineNumber: j });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      result.push({ type: 'added', value: newLines[j - 1], newLineNumber: j });
      j -= 1;
    } else {
      result.push({ type: 'removed', value: oldLines[i - 1], oldLineNumber: i });
      i -= 1;
    }
  }

  return result.reverse();
}

/** `true` when `diffLines` would report no changes at all. */
export function isUnchanged(oldText: string, newText: string): boolean {
  return oldText === newText;
}
