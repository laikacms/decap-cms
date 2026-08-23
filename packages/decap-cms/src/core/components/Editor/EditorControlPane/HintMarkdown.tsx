import React from 'react';

/**
 * Renders a field hint. Hints allow a small, fixed set of inline markdown
 * only: links, bold, italic and strikethrough. Everything else (headings,
 * lists, blockquotes, inline code, raw HTML) unwraps to its text content, so a
 * hint can never inject block layout or markup into the control pane.
 *
 * Core deliberately bundles no markdown parser for this: the grammar below is
 * a few hundred bytes of inline scanning, and a hint is a single short line.
 */

const LINK = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/;
const STRONG = /(\*\*|__)(.+?)\1/;
const EM = /(\*|_)([^*_]+?)\1/;
const DEL = /~~(.+?)~~/;
const CODE = /`([^`]+)`/;
// Raw HTML is dropped entirely, tag and content alike for script/style so an
// injected `<script>alert(1)</script>` leaves no visible text behind.
const RAW_HTML = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>|<\/?[a-zA-Z][^>]*>/g;

interface Rule {
  pattern: RegExp;
  render: (match: RegExpExecArray, key: number) => React.ReactNode;
}

const RULES: Rule[] = [
  {
    pattern: LINK,
    render: (match, key) => (
      <a
        key={key}
        href={match[2]}
        title={match[3] ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'inherit' }}
      >
        {renderInline(match[1])}
      </a>
    ),
  },
  { pattern: STRONG, render: (match, key) => <strong key={key}>{renderInline(match[2])}</strong> },
  { pattern: EM, render: (match, key) => <em key={key}>{renderInline(match[2])}</em> },
  { pattern: DEL, render: (match, key) => <del key={key}>{renderInline(match[1])}</del> },
  // Inline code keeps its text but loses its element: hints render inside a
  // label, where a <code> block would break the line box.
  { pattern: CODE, render: (match, key) => <React.Fragment key={key}>{match[1]}</React.Fragment> },
];

/** The earliest match across every inline rule, or null when there is none. */
function firstMatch(source: string): { rule: Rule, match: RegExpExecArray } | null {
  let best: { rule: Rule, match: RegExpExecArray } | null = null;
  for (const rule of RULES) {
    const match = rule.pattern.exec(source);
    if (!match) continue;
    if (!best || match.index < best.match.index) best = { rule, match };
  }
  return best;
}

function renderInline(source: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = source;
  let key = 0;

  while (rest.length > 0) {
    const found = firstMatch(rest);
    if (!found) {
      nodes.push(rest);
      break;
    }
    const { rule, match } = found;
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    nodes.push(rule.render(match, key++));
    rest = rest.slice(match.index + match[0].length);
  }

  return nodes;
}

// Block syntax is stripped rather than rendered: a hint is inline-only, so a
// heading, list item or blockquote contributes its text and nothing else.
const BLOCK_PREFIX = /^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/;

function stripBlockSyntax(line: string): string {
  let stripped = line;
  let previous: string;
  do {
    previous = stripped;
    stripped = stripped.replace(BLOCK_PREFIX, '');
  } while (stripped !== previous);
  return stripped;
}

export default function HintMarkdown({ source }: { source: string }) {
  const lines = React.useMemo(() => {
    return source
      .replace(RAW_HTML, '')
      .split('\n')
      .map(stripBlockSyntax)
      .filter(line => line.trim().length > 0);
  }, [source]);

  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {index > 0 && '\n'}
          {renderInline(line)}
        </React.Fragment>
      ))}
    </>
  );
}
