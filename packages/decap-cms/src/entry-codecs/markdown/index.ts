import type {
  CmsEntryCodec,
  CmsEntryCodecDelimiter as Delimiter,
  CmsFormatterFunctions,
  CmsFrontmatterCodec,
} from '@/lib/util/index';

/**
 * `@laikacms/decap-cms/entry-codecs/markdown` — the markdown entry codec:
 * entries stored as a frontmatter block plus an opaque text body, parsed to
 * `{ ...frontmatter, body: 'raw text' }` and reassembled on write. Kept for
 * backwards compatibility with git backends; laika-backend apps never need it
 * (their entries are plain JSON objects already).
 *
 * The codec is built by a factory so it only carries the frontmatter
 * languages you actually use. Each language is a `CmsFrontmatterCodec`: the
 * entry codec that parses the metadata block plus the markdown-level
 * embedding rules (fence delimiters, optional parse/stringify overrides).
 * Every codec module exports a ready-made config:
 *
 *     import { createMarkdownEntryCodec } from '@laikacms/decap-cms/entry-codecs/markdown';
 *     import { yamlEntryCodec, yamlFrontmatterCodec } from '@laikacms/decap-cms/entry-codecs/yaml';
 *
 *     CMS.registerEntryCodec(yamlEntryCodec);
 *     CMS.registerEntryCodec(createMarkdownEntryCodec({ frontmatter: [yamlFrontmatterCodec] }));
 *
 * Each language contributes its fences to the inferring `frontmatter` format
 * plus a `<name>-frontmatter` format. Nothing is looked up on the global
 * registry: the languages passed to the factory are the complete set this
 * codec understands.
 */

export type Content = {
  body: string,
  [key: string]: unknown,
};

export const isContent = (data: unknown): data is Content => {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
};

/** A resolved frontmatter language: a `CmsFrontmatterCodec` with defaults applied. */
interface FrontmatterLanguage {
  name: string;
  delimiters: [string, string];
  parse(input: string): unknown;
  stringify(
    metadata: object,
    opts?: { sortedKeys?: string[] | undefined, comments?: Record<string, string> | undefined },
  ): string;
}

function resolveFrontmatterCodec(entry: CmsFrontmatterCodec): FrontmatterLanguage {
  const { codec, delimiters, parse, stringify } = entry;
  return {
    name: codec.name,
    delimiters,
    parse: parse ?? (input => codec.formatter.fromFile(input)),
    stringify: stringify
      ?? ((metadata, opts) =>
        // Strip a single trailing newline: it would render as a blank line
        // before the closing fence.
        codec.formatter.toFile(metadata, opts?.sortedKeys, opts?.comments).replace(/\n$/, '')),
  };
}

// Fences historically owned by the built-in codecs. Used only to fail loudly
// when a file clearly starts with one of these but the owning language was
// not passed to the factory — silently treating the fence as body text would
// mangle data on the next save.
const legacyFenceOwners: Record<string, string> = {
  '---': 'yaml',
  '+++': 'toml',
  '{': 'json',
};

function resolveDelimiters(language: FrontmatterLanguage, customDelimiter?: Delimiter): [string, string] {
  if (!customDelimiter) {
    return language.delimiters;
  }
  return Array.isArray(customDelimiter) ? customDelimiter : [customDelimiter, customDelimiter];
}

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
  language: FrontmatterLanguage;
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
  language: FrontmatterLanguage,
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

export class FrontmatterFormatter implements CmsFormatterFunctions {
  languages: FrontmatterLanguage[];
  format: string | undefined;
  customDelimiter: Delimiter | undefined;

  constructor(languages: FrontmatterLanguage[], format?: string, customDelimiter?: Delimiter) {
    this.languages = languages;
    this.format = format;
    this.customDelimiter = customDelimiter;
  }

  private resolveLanguage(name: string): FrontmatterLanguage {
    const language = this.languages.find(candidate => candidate.name === name);
    if (!language) {
      throw new Error(
        `The markdown entry codec has no '${name}' frontmatter support. Pass its frontmatter codec `
          + `when creating it: createMarkdownEntryCodec({ frontmatter: [${name}FrontmatterCodec] }).`,
      );
    }
    return language;
  }

  fromFile(content: string): Content {
    const normalized = this.format ? content : normalizeLanguageTaggedFrontmatter(content);

    let candidates: Array<[FrontmatterLanguage, [string, string]]>;
    if (this.format) {
      const language = this.resolveLanguage(this.format);
      candidates = [[language, resolveDelimiters(language, this.customDelimiter)]];
    } else {
      candidates = this.languages.map(language => [language, language.delimiters]);
    }

    let split: SplitResult | null = null;
    for (const [language, delimiters] of candidates) {
      split = splitFrontmatter(normalized, language, delimiters);
      if (split) break;
    }

    if (!split) {
      if (!this.format) {
        // Fail loudly when the file clearly opens with a fence whose language
        // is missing; a silent body-only parse would destroy metadata on the
        // next save.
        const firstLine = (normalized.split('\n', 1)[0] ?? '').trimEnd();
        const owner = legacyFenceOwners[firstLine];
        if (owner && !candidates.some(([language]) => language.name === owner)) {
          throw new Error(
            `File starts with a '${firstLine}' frontmatter fence but the markdown entry codec `
              + `has no '${owner}' frontmatter support. Pass its frontmatter codec when creating it: `
              + `createMarkdownEntryCodec({ frontmatter: [${owner}FrontmatterCodec] }).`,
          );
        }
      }
      // No frontmatter: the whole file is the body.
      return normalized === '' ? ({} as Content) : ({ body: normalized } as Content);
    }

    const frontmatter = split.language.parse(split.rawFrontmatter);
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

  toFile(data: object, sortedKeys?: string[], comments?: Record<string, string>) {
    const { body: rawBody, ...frontmatter } = (data ?? {}) as Content;
    const body = normalizeBody(rawBody);

    // Match grey-matter behaviour: no frontmatter keys -> emit the body alone.
    // (Resolved before the language lookup so body-only files never require a
    // frontmatter language.)
    if (Object.keys(frontmatter).length === 0) {
      return body;
    }

    // Writing defaults to the first configured language (yaml when built with
    // the standard [yaml, toml, json] set).
    const language = this.resolveLanguage(this.format || this.languages[0]?.name || 'yaml');
    const [open, close] = resolveDelimiters(language, this.customDelimiter);

    const value = language.stringify(frontmatter, { sortedKeys, comments });

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

const FRONTMATTER_SUFFIX = '-frontmatter';

export interface MarkdownEntryCodecOptions {
  /**
   * Frontmatter languages, tried in order when inferring; the first one is
   * the default language when writing. Each entry pairs an entry codec with
   * the markdown-level embedding rules (fences, parse/stringify overrides) —
   * use the ready-made `yamlFrontmatterCodec` / `tomlFrontmatterCodec` /
   * `jsonFrontmatterCodec` exports or supply your own.
   */
  frontmatter?: CmsFrontmatterCodec[];
}

/**
 * Build the markdown entry codec. Serves the format names `markdown`,
 * `frontmatter` (inferring), and `<language>-frontmatter` for every supplied
 * language, plus extension inference for `.md`/`.markdown`/`.html` files.
 */
export function createMarkdownEntryCodec(options: MarkdownEntryCodecOptions = {}): CmsEntryCodec {
  const languages: FrontmatterLanguage[] = (options.frontmatter ?? []).map(resolveFrontmatterCodec);

  const frontmatterFormats = languages.map(language => `${language.name}${FRONTMATTER_SUFFIX}`);
  const infer = new FrontmatterFormatter(languages);

  return {
    name: 'markdown',
    aliases: ['frontmatter', ...frontmatterFormats],
    fileExtensions: ['md', 'markdown', 'html'],
    defaultExtension: 'md',
    formatter: infer,
    frontmatterFormats,
    getFormatter(name, opts = {}) {
      if (name.endsWith(FRONTMATTER_SUFFIX)) {
        const languageName = name.slice(0, -FRONTMATTER_SUFFIX.length);
        if (languages.some(language => language.name === languageName)) {
          return new FrontmatterFormatter(languages, languageName, opts.customDelimiter);
        }
      }
      return infer;
    },
  };
}
