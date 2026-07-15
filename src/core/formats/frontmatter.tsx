import tomlFormatter from './toml';
import yamlFormatter from './yaml';
import jsonFormatter from './json';

const Languages = {
  YAML: 'yaml',
  TOML: 'toml',
  JSON: 'json',
} as const;

type Language = (typeof Languages)[keyof typeof Languages];

export type Delimiter = string | [string, string];

export type Content = {
  body: string;
  [key: string]: unknown;
};

export const isContent = (data: unknown): data is Content => {
  return typeof data === 'object' && data !== null;
};

const defaultDelimiters: Record<Language, [string, string]> = {
  [Languages.YAML]: ['---', '---'],
  [Languages.TOML]: ['+++', '+++'],
  [Languages.JSON]: ['{', '}'],
};

function resolveDelimiters(format: Language, customDelimiter?: Delimiter): [string, string] {
  if (!customDelimiter) {
    return defaultDelimiters[format];
  }
  return Array.isArray(customDelimiter) ? customDelimiter : [customDelimiter, customDelimiter];
}

const parsers = {
  toml: {
    parse: (input: string) => tomlFormatter.fromFile(input),
    stringify: (metadata: object, opts?: { sortedKeys?: string[] }) => {
      const { sortedKeys } = opts || {};
      return tomlFormatter.toFile(metadata, sortedKeys);
    },
  },
  json: {
    parse: (input: string) => {
      let JSONinput = input.trim();
      // Fix JSON if leading and trailing brackets were trimmed.
      if (JSONinput.slice(0, 1) !== '{') {
        JSONinput = '{' + JSONinput + '}';
      }
      return jsonFormatter.fromFile(JSONinput);
    },
    stringify: (metadata: object) => {
      let JSONoutput = jsonFormatter.toFile(metadata).trim();
      // Trim leading and trailing brackets.
      if (JSONoutput.slice(0, 1) === '{' && JSONoutput.slice(-1) === '}') {
        JSONoutput = JSONoutput.slice(1, -1);
      }
      // Strip the leading newline + indent left over from the outer brace, and
      // any trailing newline + indent. This matches the layout the tests expect
      // when the JSON body is wrapped back inside frontmatter delimiters.
      JSONoutput = JSONoutput.replace(/^\s*\n[ \t]*/, '').replace(/\n[ \t]*$/, '');
      return JSONoutput;
    },
  },
  yaml: {
    parse: (input: string) => yamlFormatter.fromFile(input),
    stringify: (
      metadata: object,
      opts?: { sortedKeys?: string[]; comments?: Record<string, string> },
    ) => {
      const { sortedKeys, comments } = opts || {};
      // yamlFormatter.toFile emits a trailing newline. When embedded between
      // frontmatter delimiters that newline becomes a blank line before the
      // closing fence, so strip it here.
      return yamlFormatter.toFile(metadata, sortedKeys, comments).replace(/\n$/, '');
    },
  },
};

// DCMS-574: some widgets (e.g. `richtext`) hand back a lazy value object
// instead of a plain string for `body` (its `toString()` fires only here, at
// file-write time). Coerce defensively so anything downstream that assumes a
// string never receives a non-string body.
function normalizeBody(rawBody: unknown): string {
  if (typeof rawBody === 'string') return rawBody;
  return rawBody == null ? '' : String(rawBody);
}

/**
 * A frontmatter block split off the raw file content. `body` is everything
 * after the closing delimiter line, VERBATIM — the body is opaque text here
 * and must never be parsed or re-serialized as markdown (it may be MDX or any
 * other format the richtext mappers handle downstream).
 */
interface SplitResult {
  language: Language;
  rawFrontmatter: string;
  body: string;
}

/** True when `line` is `delimiter`, allowing trailing whitespace only. */
function isDelimiterLine(line: string, delimiter: string): boolean {
  return line === delimiter || (line.startsWith(delimiter) && line.slice(delimiter.length).trim() === '');
}

/**
 * Split `content` into frontmatter and an untouched body for one candidate
 * format. The opening delimiter must be the first line; the closing delimiter
 * is the next line consisting of only that delimiter.
 */
function splitFrontmatter(
  content: string,
  language: Language,
  delimiters: [string, string],
): SplitResult | null {
  const [open, close] = delimiters;
  const lines = content.split('\n');
  if (!isDelimiterLine(lines[0], open)) return null;

  for (let i = 1; i < lines.length; i += 1) {
    if (isDelimiterLine(lines[i], close)) {
      return {
        language,
        rawFrontmatter: lines.slice(1, i).join('\n'),
        body: lines.slice(i + 1).join('\n'),
      };
    }
  }
  return null;
}

export class FrontmatterFormatter {
  format?: Language;
  customDelimiter?: Delimiter;

  constructor(format?: Language, customDelimiter?: Delimiter) {
    this.format = format;
    this.customDelimiter = customDelimiter;
  }

  fromFile(content: string): Content {
    const normalized = this.format ? content : normalizeLanguageTaggedFrontmatter(content);

    const candidates: Array<[Language, [string, string]]> = this.format
      ? [[this.format, resolveDelimiters(this.format, this.customDelimiter)]]
      : [
          [Languages.YAML, defaultDelimiters[Languages.YAML]],
          [Languages.TOML, defaultDelimiters[Languages.TOML]],
          [Languages.JSON, defaultDelimiters[Languages.JSON]],
        ];

    let split: SplitResult | null = null;
    for (const [language, delimiters] of candidates) {
      split = splitFrontmatter(normalized, language, delimiters);
      if (split) break;
    }

    if (!split) {
      // No frontmatter: the whole file is the body.
      return normalized === '' ? ({} as Content) : ({ body: normalized } as Content);
    }

    const frontmatter = parsers[split.language].parse(split.rawFrontmatter);
    const obj = { ...(frontmatter as object) } as Content;

    // Match grey-matter behaviour: omit `body` when there is no actual body
    // content. Without this, callers comparing parsed entries would see a
    // spurious empty `body` field for entries that only contain frontmatter.
    if (split.body !== '') {
      obj.body = split.body;
    } else {
      delete (obj as Record<string, unknown>).body;
    }

    return obj;
  }

  toFile(data: Content, sortedKeys?: string[], comments?: Record<string, string>) {
    const format = this.format || Languages.YAML;
    const [open, close] = resolveDelimiters(format, this.customDelimiter);

    const { body: rawBody, ...frontmatter } = data ?? {};
    const body = normalizeBody(rawBody);

    // Match grey-matter behaviour: no frontmatter keys -> emit the body alone.
    if (Object.keys(frontmatter).length === 0) {
      return body;
    }

    const value = parsers[format].stringify(frontmatter, { sortedKeys, comments });

    // The body is appended VERBATIM (opaque; may be MDX). A body without a
    // trailing newline yields a file without one — matching grey-matter.
    return `${open}\n${value}\n${close}\n${body}`;
  }
}

// Decap historically supported language-tagged frontmatter fences such as
// `---yaml`, `---toml`, and `---json`. The inferring parser does not
// understand those tags directly, so rewrite them to canonical delimiters
// before parsing.
function normalizeLanguageTaggedFrontmatter(content: string): string {
  const match = content.match(/^---(yaml|toml|json)\n([\s\S]*?)\n---(\n[\s\S]*)?$/);
  if (!match) return content;

  const [, lang, fmContent, rest = ''] = match;
  const body = rest.startsWith('\n') ? rest.slice(1) : rest;

  if (lang === 'yaml') {
    return `---\n${fmContent}\n---\n${body}`;
  }
  if (lang === 'toml') {
    return `+++\n${fmContent}\n+++\n${body}`;
  }
  // For JSON, the inner content already includes its own braces.
  return `${fmContent}\n${body}`;
}

export const FrontmatterInfer = new FrontmatterFormatter();

export function frontmatterYAML(customDelimiter?: Delimiter) {
  return new FrontmatterFormatter(Languages.YAML, customDelimiter);
}

export function frontmatterTOML(customDelimiter?: Delimiter) {
  return new FrontmatterFormatter(Languages.TOML, customDelimiter);
}

export function frontmatterJSON(customDelimiter?: Delimiter) {
  return new FrontmatterFormatter(Languages.JSON, customDelimiter);
}
