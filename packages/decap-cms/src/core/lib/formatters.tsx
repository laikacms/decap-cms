import { escapeRegExp, flow, get, isError, partialRight, trimEnd, trimStart } from 'lodash-es';

import { FILES } from '@/core/constants/collectionTypes';
import { COMMIT_AUTHOR, COMMIT_DATE } from '@/core/constants/commitProps';
import { getFileFromSlug, selectField, selectIdentifier, selectInferredField } from '@/core/reducers/collections';
import { stripIndent } from '@/lib/util/index';
import { stringTemplate } from '@/lib/widgets/index';
import { sanitizeSlug } from './urlHelper';

import type { CmsAssetCollection, CmsCollectionState, CmsConfig, CmsEntry, CmsSlug } from '@/lib/util/index';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;

const {
  compileStringTemplate,
  parseDateFromEntry,
  parseDateFromEntryData,
  SLUG_MISSING_REQUIRED_DATE,
  keyToPathArray,
  addFileTemplateFields,
} = stringTemplate;

const commitMessageTemplates = {
  create: 'Create {{collection}} "{{slug}}"',
  update: 'Update {{collection}} "{{slug}}"',
  delete: 'Delete {{collection}} "{{slug}}"',
  uploadMedia: 'Upload "{{path}}"',
  deleteMedia: 'Delete "{{path}}"',
  openAuthoring: '{{message}}',
} as const;

const variableRegex = /\{\{([^}]+)\}\}/g;

// The author fields come straight off the current user, who may not report
// them, so callers pass them through as-is.
type Options = {
  slug?: string | undefined,
  path?: string | undefined,
  collection?: Collection | undefined,
  authorLogin?: string | undefined,
  authorName?: string | undefined,
  authorEmail?: string | undefined,
};

export function commitMessageFormatter(
  type: keyof typeof commitMessageTemplates,
  config: CmsConfig,
  { slug, path, collection, authorLogin, authorName, authorEmail }: Options,
  isOpenAuthoring?: boolean,
) {
  const templates = { ...commitMessageTemplates, ...(config.backend.commit_messages || {}) };

  let trailers = '';
  if (config.backend.signoff_commits) {
    if (!authorName) {
      console.warn('Option signoff_commits is enabled, but author name is unknown');
    } else if (!authorEmail) {
      console.warn('Option signoff_commits is enabled, but author email is unknown');
    } else {
      trailers = `\n\nSigned-off-by: ${authorName} <${authorEmail}>\n`;
    }
  }

  const commitMessage = templates[type].replace(variableRegex, (_, variable) => {
    switch (variable) {
      case 'slug':
        return slug || '';
      case 'path':
        return path || '';
      case 'collection':
        return collection ? collection.label_singular || collection.label : '';
      case 'author-login':
        return authorLogin || '';
      case 'author-name':
        return authorName || '';
      default:
        console.warn(`Ignoring unknown variable "${variable}" in commit message template.`);
        return '';
    }
  });

  if (!isOpenAuthoring) {
    return commitMessage + trailers;
  }

  const message = templates.openAuthoring.replace(variableRegex, (_, variable) => {
    switch (variable) {
      case 'message':
        return commitMessage;
      case 'author-login':
        return authorLogin || '';
      case 'author-name':
        return authorName || '';
      default:
        console.warn(`Ignoring unknown variable "${variable}" in open authoring message template.`);
        return '';
    }
  });

  return message + trailers;
}

export function prepareSlug(slug: string) {
  return (
    slug
      .trim()
      // Convert slug to lower-case
      .toLocaleLowerCase()
      // Remove single quotes.
      .replace(/[']/g, '')
      // Replace periods with dashes.
      .replace(/[.]/g, '-')
  );
}

export function getProcessSegment(
  slugConfig?: CmsSlug,
  ignoreKeys?: string[],
  preserveSlashes?: boolean,
) {
  return (value: string, key?: string) =>
    ignoreKeys && key !== undefined && ignoreKeys.includes(key)
      ? value
      : flow([
        value => String(value),
        prepareSlug,
        partialRight(sanitizeSlug, slugConfig, preserveSlashes),
      ])(value);
}

/**
 * Returns a formatter for an entry slug and its optional collection path.
 *
 * The entry identifier, date and slug are resolved once so the formatter
 * renders the same base slug for every collision suffix. A suffix is inserted
 * after each `{{slug}}` or identifier field variable in the path, including
 * filtered ones, so nested bundle paths become `post-1/index` instead of
 * `post/index-1`. Paths without such a variable get the suffix appended to the
 * whole path.
 */
export function getSlugFormatter(
  collection: Collection,
  entryData: Record<string, unknown>,
  slugConfig?: CmsSlug,
): (suffix?: string) => string {
  const slugTemplate = collection.slug || '{{slug}}';

  const identifierField = selectIdentifier(collection) as string;
  const identifier = get(entryData, keyToPathArray(identifierField));
  if (!identifier) {
    throw new Error(
      'Collection must have a field name that is a valid entry identifier, or must have `identifier_field` set',
    );
  }

  const processSegment = getProcessSegment(slugConfig);
  const date = parseDateFromEntryData(entryData, selectInferredField(collection, 'date'))
    || new Date(Date.now());
  const slug = compileStringTemplate(
    slugTemplate,
    date,
    identifier as string,
    entryData,
    processSegment,
  );

  if (!collection.path) {
    return (suffix = '') => `${slug}${suffix}`;
  }

  const pathTemplate = prepareSlug(collection.path as string);
  const slugVariablePattern = new RegExp(
    `{{ *(?:slug|${escapeRegExp(identifierField)}) *(?:\\|[^}]*)?}}`,
    'gi',
  );
  const processPathSegment = (value: string, key: string) =>
    key === 'slug' ? value : processSegment(value, key);

  return (suffix = '') => {
    const suffixedTemplate = pathTemplate.replace(slugVariablePattern, match => `${match}${suffix}`);
    const path = compileStringTemplate(suffixedTemplate, date, slug, entryData, processPathSegment);
    return suffixedTemplate === pathTemplate ? `${path}${suffix}` : path;
  };
}

export function slugFormatter(
  collection: Collection,
  entryData: Record<string, unknown>,
  slugConfig?: CmsSlug,
) {
  return getSlugFormatter(collection, entryData, slugConfig)();
}

/**
 * Upper bound on a generated slug, in UTF-8 bytes. Leaves a filename of
 * slug + extension under NAME_MAX (255 bytes) with room for any plausible
 * extension, including i18n ones such as `.en.md`.
 */
export const MAX_SLUG_BYTES = 200;

/**
 * The longest a git ref may be on GitHub is 255 bytes including `refs/heads/`,
 * which leaves 244 for the branch name itself.
 */
const MAX_BRANCH_BYTES = 255 - 'refs/heads/'.length;

/** Below this, a slug stops being useful; only an absurd config gets here. */
const MIN_SLUG_BYTES = 32;

function codePointBytes(char: string) {
  const codePoint = char.codePointAt(0) as number;
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

export function utf8ByteLength(str: string) {
  return Array.from(str).reduce((total, char) => total + codePointBytes(char), 0);
}

/**
 * How many bytes a newly generated slug may take. Editorial workflow keeps
 * each entry on a branch named `cms/<collection>/<slug>` (open authoring puts
 * `<owner>/<repo>/` in front of the collection), and the branch is parsed back
 * into collection and slug, so the slug itself is what has to fit: hashing
 * the branch name would break that round trip.
 */
export function slugByteBudget(collection: Collection, config?: CmsConfig) {
  const repo = config?.backend?.open_authoring ? config.backend.repo : undefined;
  const branchPrefix = ['cms', repo, collection.name].filter(Boolean).join('/') + '/';
  const budget = Math.min(MAX_SLUG_BYTES, MAX_BRANCH_BYTES - utf8ByteLength(branchPrefix));
  return Math.max(budget, MIN_SLUG_BYTES);
}

/**
 * Cut a slug down to `maxBytes` of UTF-8. Cuts on a code point, so no
 * surrogate pair is split, then drops whatever separators the cut left at the
 * end (`-`, `_`, `.`, `/`, whitespace, or the configured replacement): a ref
 * may not end in `/` or `.`, and a dangling dash is never what anyone wants.
 */
export function truncateSlug(slug: string, maxBytes: number, slugConfig?: CmsSlug) {
  if (utf8ByteLength(slug) <= maxBytes) {
    return slug;
  }

  let bytes = 0;
  const kept: string[] = [];
  for (const char of Array.from(slug)) {
    bytes += codePointBytes(char);
    if (bytes > maxBytes) break;
    kept.push(char);
  }

  const replacement = slugConfig?.sanitize_replacement;
  let truncated = kept.join('');
  let previous;
  do {
    previous = truncated;
    truncated = truncated.replace(/[\s\-_./]+$/u, '');
    if (replacement && truncated.endsWith(replacement)) {
      truncated = truncated.slice(0, -replacement.length);
    }
  } while (truncated !== previous);

  return truncated;
}

export function previewUrlFormatter(
  baseUrl: string,
  collection: Collection,
  slug: string,
  entry: EntryMap,
  slugConfig?: CmsSlug,
) {
  /**
   * Preview URL can't be created without `baseUrl`. This makes preview URLs
   * optional for backends that don't support them.
   */
  if (!baseUrl) {
    return;
  }

  const basePath = trimEnd(baseUrl, '/');

  const isFileCollection = collection.type === FILES;
  const file = isFileCollection ? getFileFromSlug(collection, entry.slug) : undefined;

  function getPathTemplate() {
    return file?.preview_path ?? collection.preview_path;
  }

  function getDateField() {
    return file?.preview_path_date_field ?? collection.preview_path_date_field;
  }

  /**
   * If a `previewPath` is provided for the collection/file, use it to construct the
   * URL path.
   */
  const pathTemplate = getPathTemplate();

  /**
   * Without a `previewPath` for the collection/file (via config), the preview URL
   * will be the URL provided by the backend.
   */
  if (!pathTemplate) {
    return baseUrl;
  }

  let fields = entry.data as Record<string, string>;
  fields = addFileTemplateFields(entry.path, fields, collection.folder);
  const dateFieldName = getDateField() || selectInferredField(collection, 'date');
  const date = parseDateFromEntry(entry as unknown as Record<string, unknown>, dateFieldName);
  const previewPathPreserveSlashes = file?.preview_path_preserve_slashes ?? collection.preview_path_preserve_slashes;
  const preserveSlashes = !!(previewPathPreserveSlashes ?? collection.nested);

  // Prepare and sanitize slug variables only, leave the rest of the
  // `preview_path` template as is. The `{{dirname}}`, `{{filename}}`, and
  // `{{extension}}` variables are always exempt from slug-sanitization (see
  // docs/core/preview-path.md). The exemption is scoped to those specific
  // template variables (by key), not to any field whose value happens to
  // match one of their values.
  const processSegment = getProcessSegment(
    slugConfig,
    ['dirname', 'filename', 'extension'],
    preserveSlashes,
  );
  let compiledPath;

  try {
    compiledPath = compileStringTemplate(pathTemplate, date, slug, fields, processSegment);
  } catch (err: unknown) {
    // Print an error and ignore `preview_path` if both:
    //   1. Date is invalid (according to DayJs), and
    //   2. A date expression (eg. `{{year}}`) is used in `preview_path`
    if (isError(err) && err.name === SLUG_MISSING_REQUIRED_DATE) {
      console.error(stripIndent`
        Collection "${collection.name}" configuration error:
          \`preview_path_date_field\` must be a field with a valid date. Ignoring \`preview_path\`.
      `);
      return basePath;
    }
    throw err;
  }

  const previewPath = trimStart(compiledPath, ' /');
  return `${basePath}/${previewPath}`;
}

export function summaryFormatter(summaryTemplate: string, entry: EntryMap, collection: Collection) {
  let entryData = { ...(entry.data as Record<string, string>) };
  const date = parseDateFromEntry(
    entry as unknown as Record<string, unknown>,
    selectInferredField(collection, 'date'),
  ) || null;
  const identifier = get(entryData, keyToPathArray(selectIdentifier(collection) as string));

  entryData = addFileTemplateFields(entry.path, entryData, collection.folder);
  // allow commit information in summary template
  if (entry.author && !selectField(collection, COMMIT_AUTHOR)) {
    entryData = { ...entryData, [COMMIT_AUTHOR]: entry.author };
  }
  if (entry.updatedOn && !selectField(collection, COMMIT_DATE)) {
    entryData = { ...entryData, [COMMIT_DATE]: entry.updatedOn };
  }
  const summary = compileStringTemplate(summaryTemplate, date, identifier, entryData);
  return summary;
}

export function folderFormatter(
  folderTemplate: string,
  entry: EntryMap | undefined,
  collection: Collection,
  defaultFolder: string,
  folderKey: string,
  slugConfig?: CmsSlug,
) {
  if (!entry || !entry.data) {
    return folderTemplate;
  }

  let fields = { ...(entry.data as Record<string, string>), [folderKey]: defaultFolder };
  fields = addFileTemplateFields(entry.path, fields, collection.folder);

  const date = parseDateFromEntry(
    entry as unknown as Record<string, unknown>,
    selectInferredField(collection, 'date'),
  ) || null;
  const identifier = get(fields, keyToPathArray(selectIdentifier(collection) as string));
  // `{{dirname}}`, `{{filename}}`, `{{extension}}`, and the folder's own
  // variable (`{{media_folder}}` / `{{public_folder}}`) are always exempt
  // from slug-sanitization, mirroring `previewUrlFormatter` (see
  // docs/core/preview-path.md). The exemption is scoped by key, not by
  // whichever value those variables happen to hold.
  const processSegment = getProcessSegment(
    slugConfig,
    [folderKey, 'dirname', 'filename', 'extension'],
  );

  const mediaFolder = compileStringTemplate(
    folderTemplate,
    date,
    identifier as string | undefined,
    fields,
    processSegment,
  );

  return mediaFolder;
}

/**
 * Applies an asset collection's `filename_template` (DCMS-1412) to a
 * sanitized upload filename. The template must produce the whole filename
 * (see `CmsAssetCollection.filename_template`'s doc comment); when unset the
 * original filename passes through unchanged. `{{index}}` is resolved by
 * incrementing a 1-based counter until the result doesn't collide (case
 * insensitively) with `existingNames`, so templates that don't reference it
 * are only ever compiled once.
 */
export function assetFilenameFormatter(
  assetCollection: Pick<CmsAssetCollection, 'filename_template'>,
  originalFileName: string,
  opts: { entrySlug?: string, date?: Date, existingNames?: Iterable<string> } = {},
): string {
  const template = assetCollection.filename_template;
  if (!template) {
    return originalFileName;
  }

  const fields = addFileTemplateFields(originalFileName, {});
  fields.entry_slug = opts.entrySlug ?? fields.filename;

  const existing = new Set(Array.from(opts.existingNames ?? [], name => name.toLowerCase()));
  const date = opts.date ?? new Date();
  const usesIndex = template.includes('{{index}}');

  let index = 1;
  let resolved: string;
  do {
    resolved = compileStringTemplate(template, date, fields.filename, {
      ...fields,
      index: String(index),
    });
    index += 1;
  } while (usesIndex && existing.has(resolved.toLowerCase()) && index < 10000);

  return resolved;
}
