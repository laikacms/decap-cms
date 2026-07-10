// Core types

export type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

export interface FormatExtensions {
  yml: string;
  yaml: string;
  toml: string;
  json: string;
  frontmatter: string;
  'json-frontmatter': string;
  'toml-frontmatter': string;
  'yaml-frontmatter': string;
}

export type ComponentType<P = unknown> = unknown; // TODO: type properly

export type JSXElement = unknown; // TODO: type properly

export type Pluggable = unknown; // Placeholder for Remark Pluggable
