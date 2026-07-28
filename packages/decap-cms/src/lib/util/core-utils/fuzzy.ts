// Inlined replacement for the `fuzzy` package (0.1.3), keeping only the
// subsequence matching and ordering the CMS uses (dependency-reduction
// Phase 2). Scoring must stay bit-identical to the original: `Backend.search`
// filters on `score > 5`, and an exact match scores `Infinity`.

export interface FuzzyFilterResult<T> {
  index: number;
  score: number;
  original: T;
}

function fuzzyScore(pattern: string, str: string): number | null {
  const compareString = str.toLowerCase();
  const comparePattern = pattern.toLowerCase();

  let patternIdx = 0;
  let totalScore = 0;
  let currScore = 0;

  for (let idx = 0; idx < compareString.length; idx++) {
    if (compareString[idx] === comparePattern[patternIdx]) {
      patternIdx += 1;
      // consecutive matching characters increase the score more than linearly
      currScore += 1 + currScore;
    } else {
      currScore = 0;
    }
    totalScore += currScore;
  }

  if (patternIdx !== comparePattern.length) {
    return null;
  }
  return compareString === comparePattern ? Infinity : totalScore;
}

/**
 * Returns the elements of `arr` whose extracted string contains `pattern` as a
 * case-insensitive subsequence, sorted by descending score. Ties keep the
 * original input order.
 */
export function fuzzyFilter<T>(pattern: string, arr: T[], extract: (input: T) => string): FuzzyFilterResult<T>[] {
  const results: FuzzyFilterResult<T>[] = [];

  arr.forEach((original, index) => {
    const score = fuzzyScore(pattern, extract(original));
    if (score !== null) {
      results.push({ index, score, original });
    }
  });

  return results.sort((a, b) => {
    const byScore = b.score - a.score;
    // NaN (both Infinity) is falsy, so exact-match ties also fall through
    if (byScore) return byScore;
    return a.index - b.index;
  });
}
