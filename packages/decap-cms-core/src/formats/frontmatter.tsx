import remarkFrontmatter, { type Options } from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import type { Literal, Node, Parent } from 'unist'
import type { VFile } from 'vfile'
import { CONTINUE, EXIT, visit } from "unist-util-visit"
import { toString } from "mdast-util-to-string"
import { fromMarkdown } from "mdast-util-from-markdown"

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
type Format = { language: Language; delimiters: Delimiter };

export type Content = {
  body: string;
  [key: string]: unknown;
}

export const isContent = (data: unknown): data is Content => {
  return typeof data === 'object' && data !== null && 'body' in data;
}

const formatOpts: Record<Language, Options>= {
  [Languages.YAML]: 'yaml',
  [Languages.TOML]: 'toml',
  [Languages.JSON]: { type: 'json', fence: { open: '{', close: '}' } },
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

const objectToFrontmatter = (opts: { format: Language; sortedKeys?: string[]; comments?: Record<string, string> }) => {
  const { format, sortedKeys, comments } = opts;
  return (tree: Node, file: VFile) => {
    const doc =  file.data.result

    if (!isContent(doc)) {
      throw new Error('Expected file data to contain a `body` property of type string, along with any frontmatter properties.')
    }

    if (!doc) return

    const { body = "", ...frontmatter } = doc

    // rebuild markdown AST from body
    const newTree = fromMarkdown(body)

    if (Object.keys(frontmatter).length > 0) {
      const value = parsers[format].stringify(frontmatter, { sortedKeys, comments })

      newTree.children.unshift({
        type: format as any,
        value
      })
    }

    // replace original tree
    (tree as Parent).children = newTree.children
  }
}

const frontmatterToObject = () => {
  return (tree: Node, file: VFile) => {
    let frontmatter = {}

    const formats = Object.keys(parsers)

    visit(tree, formats, (node, index, parent) => {
      if (Object.prototype.hasOwnProperty.call(parsers, node.type)) {
        const parser = parsers[node.type as Language]
        const nodeLiteral = node as Literal

        frontmatter = parser.parse(nodeLiteral.value as string);
        (parent as Parent).children.splice(index as number, 1);

        return EXIT;
      } else {
        return CONTINUE;
      }
    })

    file.result = {
      body: toString(tree),
      ...frontmatter
    }
  }
}

const defaultOptions: Options = ['yaml', 'toml', { type: 'json', fence: { open: '{', close: '}' } }];

export class FrontmatterFormatter {
  format?: Language;
  customDelimiter?: Delimiter;

  constructor(format?: Language, customDelimiter?: Delimiter) {
    this.format = format;
    this.customDelimiter = customDelimiter;
  }

  fromFile(content: string): Content {
    const options = this.format ? formatOpts[this.format] : defaultOptions;

    const result = unified()
      .use(remarkParse)
      .use(remarkStringify)
      .use(remarkFrontmatter, options)
      .use(frontmatterToObject)
      .processSync(content);

    const obj = { ...result.result as object } as Content;

    return obj;
  }

  toFile(
    data: Content,
    sortedKeys?: string[],
    comments?: Record<string, string>,
  ) {
    const options = this.format ? formatOpts[this.format] : defaultOptions;

    const markdown = unified()
      .use(objectToFrontmatter, { format: this.format || 'yaml', sortedKeys, comments })
      .use(remarkFrontmatter, options)
      .use(remarkStringify)
      .processSync({ data: { result: data } });

    return String(markdown);
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
