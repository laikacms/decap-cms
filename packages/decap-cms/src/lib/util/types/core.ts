// Core types

import type { ComponentType as ReactComponentType, ReactElement } from 'react';

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

export type ComponentType<P = unknown> = ReactComponentType<P>;

export type JSXElement = ReactElement;

export type Pluggable = unknown; // Placeholder for Remark Pluggable
