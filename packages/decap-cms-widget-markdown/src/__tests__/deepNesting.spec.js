import { markdownToSlate, slateToMarkdown } from '../serializers';

/**
 * Regression tests for DCMS-519 / GitHub issue #563: pathologically deep
 * blockquote/list/heading nesting should convert between Markdown and
 * Slate's Raw AST without hanging or blowing the call stack, and the
 * conversion should converge (running it again on its own output should be
 * a no-op / stable), rather than looping or growing without bound.
 */

function nestedBlockquoteMarkdown(depth) {
  return '> '.repeat(depth) + 'leaf text';
}

function nestedListMarkdown(depth) {
  const lines = [];
  for (let i = 0; i <= depth; i++) {
    lines.push('  '.repeat(i) + '- item');
  }
  return lines.join('\n');
}

describe('deeply nested markdown <-> Slate round trip', () => {
  it('converts a very deeply nested blockquote (100 levels) without hanging or throwing', () => {
    const markdown = nestedBlockquoteMarkdown(100);

    const slate = markdownToSlate(markdown, {});
    expect(Array.isArray(slate)).toBe(true);

    const roundTripped = slateToMarkdown(slate, {});
    expect(typeof roundTripped).toBe('string');
    expect(roundTripped.length).toBeGreaterThan(0);
  });

  it('converges when the blockquote round trip is run twice in a row', () => {
    const markdown = nestedBlockquoteMarkdown(100);

    const firstPass = slateToMarkdown(markdownToSlate(markdown, {}), {});
    const secondPass = slateToMarkdown(markdownToSlate(firstPass, {}), {});

    // Running the conversion again on its own output should be stable
    // (a fixed point), not keep mutating the tree indefinitely.
    expect(secondPass).toEqual(firstPass);
  });

  it('converts a 200-character-long ATX-style heading run without throwing', () => {
    const markdown = '#'.repeat(200) + ' h';

    const slate = markdownToSlate(markdown, {});
    expect(Array.isArray(slate)).toBe(true);

    const roundTripped = slateToMarkdown(slate, {});
    expect(typeof roundTripped).toBe('string');
  });

  it('converts a deeply nested bulleted list (60 levels) without hanging or throwing', () => {
    const markdown = nestedListMarkdown(60);

    const slate = markdownToSlate(markdown, {});
    expect(Array.isArray(slate)).toBe(true);

    const roundTripped = slateToMarkdown(slate, {});
    expect(typeof roundTripped).toBe('string');
    expect(roundTripped.length).toBeGreaterThan(0);
  });

  it('does not exceed the max stack for pathologically deep (1500-level) blockquote nesting', () => {
    // 1500 levels is far beyond MAX_NESTING_DEPTH (500) in slateRemark.js /
    // remarkSlate.js, exercising the depth-guard's flatten-to-text fallback
    // in both conversion directions.
    const markdown = nestedBlockquoteMarkdown(1500);

    expect(() => {
      const slate = markdownToSlate(markdown, {});
      slateToMarkdown(slate, {});
    }).not.toThrow();
  });
});
