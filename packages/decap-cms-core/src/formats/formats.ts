import get from 'lodash/get';

import yamlFormatter from './yaml';
import tomlFormatter from './toml';
import jsonFormatter from './json';
import { FrontmatterInfer, frontmatterJSON, frontmatterTOML, frontmatterYAML } from './frontmatter';
import { getCustomFormatsExtensions, getCustomFormatsFormatters } from '../lib/registry';

import type { Delimiter } from './frontmatter';
import type { Collection, EntryObject, Format } from '../types/redux';
import type { EntryValue } from '../valueObjects/Entry';
import type { Formatter } from 'decap-cms-core';

export const frontmatterFormats = ['yaml-frontmatter', 'toml-frontmatter', 'json-frontmatter'];

export const formatExtensions = {
  yml: 'yml',
  yaml: 'yml',
  toml: 'toml',
  json: 'json',
  frontmatter: 'md',
  'json-frontmatter': 'md',
  'toml-frontmatter': 'md',
  'yaml-frontmatter': 'md',
};

export function getFormatExtensions() {
  return { ...formatExtensions, ...getCustomFormatsExtensions() };
}

export const extensionFormatters = {
  yml: yamlFormatter,
  yaml: yamlFormatter,
  toml: tomlFormatter,
  json: jsonFormatter,
  md: FrontmatterInfer,
  markdown: FrontmatterInfer,
  html: FrontmatterInfer,
};

function formatByName(name: Format, customDelimiter?: Delimiter): Formatter {
  const formatters: Record<string, Formatter> = {
    yml: yamlFormatter,
    yaml: yamlFormatter,
    toml: tomlFormatter,
    json: jsonFormatter,
    frontmatter: FrontmatterInfer,
    'json-frontmatter': frontmatterJSON(customDelimiter),
    'toml-frontmatter': frontmatterTOML(customDelimiter),
    'yaml-frontmatter': frontmatterYAML(customDelimiter),
    ...getCustomFormatsFormatters(),
  };
  if (name in formatters) {
    return formatters[name];
  }
  throw new Error(`No formatter available with name: ${name}`);
}

export function resolveFormat(collection: Collection, entry: EntryObject | EntryValue) {
  // Check for custom delimiter
  const frontmatter_delimiter = collection.frontmatter_delimiter;
  const customDelimiter = Array.isArray(frontmatter_delimiter)
    ? (frontmatter_delimiter as [string, string])
    : frontmatter_delimiter;

  // If the format is specified in the collection, use that format.
  const formatSpecification = collection.format;
  if (formatSpecification) {
    return formatByName(formatSpecification, customDelimiter);
  }

  // If a file already exists, infer the format from its file extension.
  const filePath = entry && entry.path;
  if (filePath) {
    const fileExtension = filePath.split('.').pop();
    if (fileExtension) {
      return get(extensionFormatters, fileExtension);
    }
  }

  // If creating a new file, and an `extension` is specified in the
  //   collection config, infer the format from that extension.
  const extension = collection.extension;
  if (extension) {
    return get(extensionFormatters, extension);
  }

  // If no format is specified and it cannot be inferred, return the default.
  return formatByName('frontmatter', customDelimiter);
}
