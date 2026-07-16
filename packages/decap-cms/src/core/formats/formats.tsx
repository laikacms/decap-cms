import { get } from 'lodash-es';

import {
  getCustomFormatsExtensions,
  getCustomFormatsFormatters,
  getEntryCodec,
  getEntryCodecs,
} from '@/core/lib/registry';

import type { EntryValue } from '@/core/valueObjects/Entry';
import type {
  CmsCollectionFormatType,
  CmsCollectionState,
  CmsEntryCodecDelimiter as Delimiter,
  CmsFormatterFunctions,
} from '@/lib/util/index';

type Collection = CmsCollectionState;
type Format = CmsCollectionFormatType;
type FormatterFunctions = CmsFormatterFunctions;

type EntryObject = any;

// Entry-file encodings are registry-backed entry codecs
// (`CMS.registerEntryCodec`, codecs in `src/entry-codecs/*`); nothing is
// bundled here, not even frontmatter handling — markdown entries are served
// by `createMarkdownEntryCodec` (`entry-codecs/markdown`), built explicitly
// with the frontmatter languages a deployment uses.

/** Format names accepting `frontmatter_delimiter` (e.g. 'yaml-frontmatter'). */
export function getFrontmatterFormats(): string[] {
  return getEntryCodecs().flatMap(codec => codec.frontmatterFormats ?? []);
}

/** Map of format name -> extension used when creating new files. */
export function getFormatExtensions(): Record<string, string> {
  const extensions: Record<string, string> = {};
  for (const codec of getEntryCodecs()) {
    for (const name of [codec.name, ...(codec.aliases ?? [])]) {
      extensions[name] = codec.defaultExtension;
    }
  }
  return { ...extensions, ...getCustomFormatsExtensions() };
}

/** Map of file extension -> formatter, for inferring a format from a path. */
export function getExtensionFormatters(): Record<string, FormatterFunctions> {
  const formatters: Record<string, FormatterFunctions> = {};
  for (const codec of getEntryCodecs()) {
    for (const extension of codec.fileExtensions) {
      formatters[extension] = codec.formatter;
    }
  }
  return formatters;
}

function formatByName(name: Format, customDelimiter?: Delimiter): FormatterFunctions {
  // Custom formats (`registerCustomFormat`) intentionally shadow built-ins.
  const custom = getCustomFormatsFormatters();
  if (name in custom) {
    return custom[name];
  }
  const codec = getEntryCodec(name);
  if (codec) {
    return codec.getFormatter?.(name, { customDelimiter }) ?? codec.formatter;
  }
  const registered = getEntryCodecs().flatMap(entry => [entry.name, ...(entry.aliases ?? [])]);
  throw new Error(
    `No formatter available with name: ${name}. Registered entry codecs: ${registered.join(', ') || '(none)'}. `
      + `Register one via CMS.registerEntryCodec (e.g. import { yamlEntryCodec } from `
      + `'@laikacms/decap-cms/entry-codecs/yaml'; markdown/frontmatter entries come from `
      + `createMarkdownEntryCodec in '@laikacms/decap-cms/entry-codecs/markdown').`,
  );
}

function frontmatterDelimiterIsArray(
  frontmatterDelimiter?: Delimiter | string[],
): frontmatterDelimiter is string[] {
  return Array.isArray(frontmatterDelimiter);
}

export function resolveFormat(collection: Collection, entry: EntryObject | EntryValue) {
  // Check for custom delimiter
  const frontmatter_delimiter = collection.frontmatter_delimiter;
  const customDelimiter = frontmatterDelimiterIsArray(frontmatter_delimiter)
    ? (frontmatter_delimiter as [string, string])
    : (frontmatter_delimiter as Delimiter | undefined);

  // If the format is specified in the collection, use that format.
  const formatSpecification = collection.format;
  if (formatSpecification) {
    return formatByName(formatSpecification as Format, customDelimiter);
  }

  // If a file already exists, infer the format from its file extension.
  const filePath = entry && entry.path;
  if (filePath) {
    const fileExtension = filePath.split('.').pop();
    if (fileExtension) {
      return get(getExtensionFormatters(), fileExtension);
    }
  }

  // If creating a new file, and an `extension` is specified in the
  //   collection config, infer the format from that extension.
  const extension = collection.extension;
  if (extension) {
    return get(getExtensionFormatters(), extension);
  }

  // If no format is specified and it cannot be inferred, fall back to the
  // historical default: markdown with inferred frontmatter.
  return formatByName('frontmatter', customDelimiter);
}
