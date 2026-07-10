import { print } from 'graphql';

import { files } from '../queries';

function printFiles(depth: number) {
  return print(files(depth));
}

function countOccurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

// Matches only the `... on Tree { ... }` inline fragment used for tree-walking,
// not the unrelated `fragment FileEntryParts on TreeEntry { ... }` definition
// (which also contains the raw substring "on Tree" as a prefix of "TreeEntry").
function countOnTreeFragments(query: string) {
  return countOccurrences(query, 'on Tree {');
}

// Counts usages (spreads) of the FileEntryParts fragment, excluding its own
// `fragment FileEntryParts on TreeEntry { ... }` definition line.
function countFileEntrySpreads(query: string) {
  return countOccurrences(query, '...FileEntryParts');
}

// Counts recursive `object { ... on Tree` nesting wrappers introduced by
// buildFilesQuery's loop, excluding the unrelated `blob: object { ... on Blob }`
// block that comes from the FileEntryParts fragment definition.
function countNestedTreeObjectWrappers(query: string) {
  const matches = query.match(/object\s*{\s*\.\.\. on Tree/g);
  return matches ? matches.length : 0;
}

describe('queries', () => {
  describe('files', () => {
    it('should not nest any object block for depth = 0', () => {
      const query = printFiles(0);

      // only the top-level `... on Tree { entries { ... } }` is present
      expect(countOnTreeFragments(query)).toBe(1);
      expect(countFileEntrySpreads(query)).toBe(1);
      // no recursive `object { ... on Tree` wrapping beyond the top-level entries
      expect(countNestedTreeObjectWrappers(query)).toBe(0);
    });

    it('should behave the same as depth = 0 for depth = 1 (no recursion needed)', () => {
      const depth0 = printFiles(0);
      const depth1 = printFiles(1);

      expect(depth1).toBe(depth0);
      expect(countOnTreeFragments(depth1)).toBe(1);
    });

    it('should nest one additional object/Tree/entries level for depth = 2', () => {
      const query = printFiles(2);

      expect(countOnTreeFragments(query)).toBe(2);
      expect(countFileEntrySpreads(query)).toBe(2);
      expect(countNestedTreeObjectWrappers(query)).toBe(1);
    });

    it('should nest two additional object/Tree/entries levels for depth = 3', () => {
      const query = printFiles(3);

      expect(countOnTreeFragments(query)).toBe(3);
      expect(countFileEntrySpreads(query)).toBe(3);
      expect(countNestedTreeObjectWrappers(query)).toBe(2);
    });

    it('should not leave a PLACE_HOLDER token in the generated query at any depth', () => {
      for (const depth of [0, 1, 2, 3, 5]) {
        expect(printFiles(depth)).not.toMatch(/PLACE_HOLDER/);
      }
    });

    it('should produce a query with strictly increasing nesting as depth grows', () => {
      const counts = [0, 1, 2, 3, 4].map(depth => countOnTreeFragments(printFiles(depth)));

      // depth 0 and depth 1 both yield a single top-level `on Tree`
      expect(counts).toEqual([1, 1, 2, 3, 4]);
    });

    it('should include the query operation name and repository/object structure', () => {
      const query = printFiles(2);

      expect(query).toContain('query files(');
      expect(query).toContain('repository(owner: $owner, name: $name)');
      expect(query).toContain('object(expression: $expression)');
      expect(query).toContain('RepositoryParts');
      expect(query).toContain('ObjectParts');
    });
  });
});
