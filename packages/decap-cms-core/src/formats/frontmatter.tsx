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
  const [open, close] = Array.isArray(customDelimiter) ? customDelimiter : [customDelimiter, customDelimiter];
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
      return yamlFormatter.toFile(metadata, sortedKeys, comments);
    },
  },
};

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

    const { body = '', ...frontmatter } = doc;

    // rebuild markdown AST from body
    const newTree = fromMarkdown(body);

    if (Object.keys(frontmatter).length > 0) {
      // Strip trailing newlines so remark-stringify doesn't emit a blank line
      // before the closing delimiter (the underlying yaml/toml libs append one).
      const value = parsers[format]
        .stringify(frontmatter, { sortedKeys, comments })
        .replace(/\r?\n+$/, '');

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

// Decap historically supported language-tagged opening delimiters
// (`---yaml`, `---toml`, `---json`) for content authored under gray-matter.
// remark-frontmatter doesn't recognise them, so swap them for the
// conventional delimiters of the indicated language before parsing.
function stripLanguageTaggedDelimiter(content: string): string {
  const opener = content.match(/^---(yaml|toml|json)\r?\n/);
  if (!opener) return content;
  const lang = opener[1] as 'yaml' | 'toml' | 'json';
  const rest = content.slice(opener[0].length);
  const close = rest.match(/(^|\r?\n)---(?=\r?\n|$)/);
  if (!close) return content;
  const closeIdx = (close.index ?? 0) + close[1].length;
  const fmBody = rest.slice(0, closeIdx);
  const after = rest.slice(closeIdx + 3);
  if (lang === 'json') {
    // The content already includes its own `{`/`}` braces; just drop the
    // language-tagged wrapper lines.
    return `${fmBody}${after}`;
  }
  const wrap = lang === 'toml' ? '+++' : '---';
  return `${wrap}\n${fmBody}${wrap}${after}`;
}

// Delimiter line: either 3+ identical punctuation characters on a line by
// themselves (yaml/toml-style `---`, `+++`, etc.), or a single `{` / `}`
// that brackets a JSON frontmatter block.
const DELIMITER_LINE_RE = /^(?:([-+~^=*#])\1{2,}|\{|\})$/;

// remark-stringify pads frontmatter blocks with a blank line before the body
// and emits a trailing newline. Collapse the gap so the output matches the
// canonical `---\n<body>` shape downstream tools expect, and preserve the
// caller's trailing-newline preference on `body` (a body ending with `\n`
// stays that way; one without doesn't get one added). When there is no body
// at all the closing delimiter still gets a single trailing newline.
function normalizeFrontmatterOutput(output: string, body: string): string {
  // Collapse every "blank line directly after a delimiter line" — there can
  // be two: one inside the frontmatter (after the opener `{` for JSON) and
  // one between the closer and the body. `String.replace` with a function
  // only catches the first; iterate until stable.
  let collapsed = output;
  while (true) {
    const next = collapsed.replace(
      /([^\r\n]*)(\r?\n)\r?\n+/,
      (match, lastLine: string, nl: string) => {
        return DELIMITER_LINE_RE.test(lastLine) ? lastLine + nl : match;
      },
    );
    if (next === collapsed) break;
    collapsed = next;
  }
  const trimmed = collapsed.replace(/\r?\n+$/, '');
  const lastLine = trimmed.split(/\r?\n/).pop() || '';
  if (DELIMITER_LINE_RE.test(lastLine)) {
    // No body — keep one trailing newline after the closing delimiter.
    return trimmed + '\n';
  }
  // Mirror the caller's trailing-newline preference on body.
  return body.endsWith('\n') ? trimmed + '\n' : trimmed;
}

export class FrontmatterFormatter {
  format?: Language;
  customDelimiter?: Delimiter;

  constructor(format?: Language, customDelimiter?: Delimiter) {
    this.format = format;
    this.customDelimiter = customDelimiter;
  }

  fromFile(content: string): Content {
    const options = this.format
      ? buildOptions(this.format, this.customDelimiter)
      : defaultOptions;

    const result = unified()
      .use(remarkParse)
      .use(remarkStringify)
      .use(remarkFrontmatter, options)
      .use(frontmatterToObject)
      .processSync(stripLanguageTaggedDelimiter(content));

    const obj = { ...(result.result as object) } as Content;

    return obj;
  }

  toFile(data: Content, sortedKeys?: string[], comments?: Record<string, string>) {
    const options = this.format
      ? buildOptions(this.format, this.customDelimiter)
      : defaultOptions;

    const markdown = unified()
      .use(remarkParse)
      .use(objectToFrontmatter, { format: this.format || 'yaml', sortedKeys, comments })
      .use(remarkFrontmatter, options)
      .use(remarkStringify)
      .processSync({ data: { result: data } });

    return normalizeFrontmatterOutput(String(markdown), data.body ?? '');
  }
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
