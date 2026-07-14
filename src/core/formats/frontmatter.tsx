import remarkFrontmatter, { type Options } from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { CONTINUE, EXIT, visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { fromMarkdown } from 'mdast-util-from-markdown';

import tomlFormatter from './toml';
import yamlFormatter from './yaml';
import jsonFormatter from './json';

import type { VFile } from 'vfile';
import type { Literal, Node, Parent } from 'unist';

const Languages = {
  YAML: 'yaml',
  TOML: 'toml',
  JSON: 'json',
} as const;

type Language = (typeof Languages)[keyof typeof Languages];

export type Delimiter = string | [string, string];
type Format = { language: Language; delimiters: Delimiter };

export type Content = {
  body: string;
  [key: string]: unknown;
};

export const isContent = (data: unknown): data is Content => {
  return typeof data === 'object' && data !== null;
};

const formatOpts: Record<Language, Options> = {
  [Languages.YAML]: 'yaml',
  [Languages.TOML]: 'toml',
  [Languages.JSON]: { type: 'json', fence: { open: '{', close: '}' } },
};

function buildOptions(format: Language, customDelimiter?: Delimiter): Options {
  if (!customDelimiter) {
    return formatOpts[format];
  }
  const [open, close] = Array.isArray(customDelimiter)
    ? customDelimiter
    : [customDelimiter, customDelimiter];
  return { type: format, fence: { open, close } };
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
// file-write time). Coerce defensively so `fromMarkdown` — and anything else
// downstream that assumes a string — never receives a non-string body.
function normalizeBody(rawBody: unknown): string {
  if (typeof rawBody === 'string') return rawBody;
  return rawBody == null ? '' : String(rawBody);
}

const objectToFrontmatter = (opts: {
  format: Language;
  sortedKeys?: string[];
  comments?: Record<string, string>;
}) => {
  const { format, sortedKeys, comments } = opts;
  return (tree: Node, file: VFile) => {
    const doc = file.data.result;

    if (!isContent(doc)) {
      throw new Error(
        'Expected file data to contain a `body` property of type string, along with any frontmatter properties.',
      );
    }

    if (!doc) return;

    const { body: rawBody, ...frontmatter } = doc;
    const body = normalizeBody(rawBody);

    // rebuild markdown AST from body
    const newTree = fromMarkdown(body);

    if (Object.keys(frontmatter).length > 0) {
      const value = parsers[format].stringify(frontmatter, { sortedKeys, comments });

      newTree.children.unshift({
        type: format as any,
        value,
      });
    }

    // replace original tree
    (tree as Parent).children = newTree.children;
  };
};

const frontmatterToObject = () => {
  return (tree: Node, file: VFile) => {
    let frontmatter = {};

    const formats = Object.keys(parsers);

    visit(tree, formats, (node, index, parent) => {
      if (Object.prototype.hasOwnProperty.call(parsers, node.type)) {
        const parser = parsers[node.type as Language];
        const nodeLiteral = node as Literal;

        frontmatter = parser.parse(nodeLiteral.value as string);
        (parent as Parent).children.splice(index as number, 1);

        return EXIT;
      } else {
        return CONTINUE;
      }
    });

    file.result = {
      ...frontmatter,
      body: toString(tree),
    };
  };
};

const defaultOptions: Options = [
  'yaml',
  'toml',
  { type: 'json', fence: { open: '{', close: '}' } },
];

export class FrontmatterFormatter {
  format?: Language;
  customDelimiter?: Delimiter;

  constructor(format?: Language, customDelimiter?: Delimiter) {
    this.format = format;
    this.customDelimiter = customDelimiter;
  }

  fromFile(content: string): Content {
    const options = this.format ? buildOptions(this.format, this.customDelimiter) : defaultOptions;

    const normalized = this.format ? content : normalizeLanguageTaggedFrontmatter(content);

    const result = unified()
      .use(remarkParse)
      .use(remarkStringify)
      .use(remarkFrontmatter, options)
      .use(frontmatterToObject)
      .processSync(normalized);

    const obj = { ...(result.result as object) } as Content;

    // Match grey-matter behaviour: omit `body` when there is no actual body
    // content. Without this, callers comparing parsed entries would see a
    // spurious empty `body` field for entries that only contain frontmatter.
    if (typeof obj.body === 'string' && obj.body === '') {
      delete (obj as Record<string, unknown>).body;
    }

    return obj;
  }

  toFile(data: Content, sortedKeys?: string[], comments?: Record<string, string>) {
    const format = this.format || Languages.YAML;
    const options = this.format ? buildOptions(this.format, this.customDelimiter) : defaultOptions;

    const markdown = unified()
      .use(remarkParse)
      .use(objectToFrontmatter, { format, sortedKeys, comments })
      .use(remarkFrontmatter, options)
      .use(remarkStringify)
      .processSync({ data: { result: data } });

    let result = String(markdown);

    // remark-stringify inserts a blank line between the closing frontmatter
    // delimiter and the body. Collapse that back to a single newline so the
    // serialized output round-trips with the body the user supplied.
    const closeDelim = getCloseDelimiter(format, this.customDelimiter);
    const closeEscaped = escapeRegExp(closeDelim);
    result = result.replace(new RegExp(`(\\n${closeEscaped}\\n)\\n`), '$1');

    // Match grey-matter behaviour: only emit a trailing newline when the body
    // actually ended with one (or when there is no body at all).
    const body = normalizeBody(data?.body);
    if (body !== '' && !body.endsWith('\n') && result.endsWith('\n')) {
      result = result.slice(0, -1);
    }

    return result;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCloseDelimiter(format: Language, customDelimiter?: Delimiter): string {
  if (customDelimiter) {
    return Array.isArray(customDelimiter) ? customDelimiter[1] : customDelimiter;
  }
  if (format === Languages.TOML) return '+++';
  if (format === Languages.JSON) return '}';
  return '---';
}

// Decap historically supported language-tagged frontmatter fences such as
// `---yaml`, `---toml`, and `---json`. remark-frontmatter does not understand
// those tags directly, so rewrite them to canonical delimiters before parsing.
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
