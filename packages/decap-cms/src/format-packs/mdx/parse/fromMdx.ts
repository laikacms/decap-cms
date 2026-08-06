import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';
import { gfm } from 'micromark-extension-gfm';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { mdxMd } from 'micromark-extension-mdx-md';

import type { Root } from 'mdast';

/**
 * Parse MDX source into an mdast tree.
 *
 * Deliberately NO acorn and NO ESM micromark extension (format-packs-plan.md
 * Phase 7): attribute/flow expressions stay opaque source strings (never
 * evaluated, never parsed as JS), and `import`/`export` lines surface as
 * plain paragraphs that `mdastToPortableText` post-passes into opaque
 * `mdx-esm` blocks. GFM is enabled to match the markdown mapper's syntax
 * (tables, strikethrough, autolink literals, task lists).
 *
 * Throws on MDX syntax errors (e.g. unclosed JSX tags) — callers must handle.
 */
export function parseMdx(source: string): Root {
  return fromMarkdown(source, {
    extensions: [mdxJsx(), mdxExpression(), mdxMd(), gfm()],
    mdastExtensions: [mdxJsxFromMarkdown(), mdxExpressionFromMarkdown(), gfmFromMarkdown()],
  });
}
