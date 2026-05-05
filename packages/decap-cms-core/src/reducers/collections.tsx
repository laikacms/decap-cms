import { produce } from 'immer';
import get from 'lodash/get';
import escapeRegExp from 'lodash/escapeRegExp';
import { stringTemplate } from 'decap-cms-lib-widgets';

import { CONFIG_SUCCESS } from '../actions/config';
import { FILES, FOLDER } from '../constants/collectionTypes';
import { COMMIT_DATE, COMMIT_AUTHOR } from '../constants/commitProps';
import { INFERABLE_FIELDS, IDENTIFIER_FIELDS, SORTABLE_FIELDS } from '../constants/fieldInference';
import { getFormatExtensions } from '../formats/formats';
import { selectMediaFolder } from './entries';
import { summaryFormatter } from '../lib/formatters';

import type {
  CmsCollectionState,
  CmsCollections,
  CmsCollectionFileState,
  CmsEntryField,
  CmsEntry,
  CmsViewFilter,
  CmsViewGroup,
  CmsConfig,
} from 'decap-cms-lib-util';
import type { ConfigAction } from '../actions/config';
import type { Backend } from '../backend';

type CollectionFiles = CmsCollectionFileState[];

const { keyToPathArray } = stringTemplate;

const defaultState: CmsCollections = {};

const collections = produce((state: CmsCollections, action: ConfigAction) => {
  switch (action.type) {
    case CONFIG_SUCCESS: {
      const newState: CmsCollections = {};
      action.payload.collections.forEach(collection => {
        newState[collection.name] = collection as unknown as CmsCollectionState;
      });
      return newState;
    }
  }
}, defaultState);

const selectors = {
  [FOLDER]: {
    entryExtension(collection: CmsCollectionState) {
      const ext =
        collection.extension || get(getFormatExtensions(), collection.format || 'frontmatter');
      if (!ext) {
        throw new Error(`No extension found for format ${collection.format}`);
      }
      return ext.replace(/^\./, '');
    },
    fields(collection: CmsCollectionState) {
      return collection.fields;
    },
    entryPath(collection: CmsCollectionState, slug: string) {
      const folder = (collection.folder as string).replace(/\/$/, '');
      return `${folder}/${slug}.${this.entryExtension(collection)}`;
    },
    entrySlug(collection: CmsCollectionState, path: string) {
      const folder = (collection.folder as string).replace(/\/$/, '');
      return path
        .split(folder + '/')
        .pop()
        ?.replace(new RegExp(`\\.${escapeRegExp(this.entryExtension(collection))}$`), '');
    },
    allowNewEntries(collection: CmsCollectionState) {
      return collection.create;
    },
    allowDeletion(collection: CmsCollectionState) {
      return collection.delete !== false;
    },
    templateName(collection: CmsCollectionState) {
      return collection.name;
    },
  },
  [FILES]: {
    fileForEntry(collection: CmsCollectionState, slug: string) {
      const files = collection.files;
      return files && files.find(f => f?.name === slug);
    },
    fields(collection: CmsCollectionState, slug: string) {
      const file = this.fileForEntry(collection, slug);
      return file && file.fields;
    },
    entryPath(collection: CmsCollectionState, slug: string) {
      const file = this.fileForEntry(collection, slug);
      return file && file.file;
    },
    entrySlug(collection: CmsCollectionState, path: string) {
      const file = (collection.files as CollectionFiles)?.find(f => f?.file === path);
      return file && file.name;
    },
    entryLabel(collection: CmsCollectionState, slug: string) {
      const file = this.fileForEntry(collection, slug);
      return file && file.label;
    },
    allowNewEntries() {
      return false;
    },
    allowDeletion(collection: CmsCollectionState) {
      return collection.delete ?? false;
    },
    templateName(_collection: CmsCollectionState, slug: string) {
      return slug;
    },
  },
};

function getFieldsWithMediaFolders(fields: CmsEntryField[]): CmsEntryField[] {
  return fields.reduce((acc, f) => {
    if (f.media_folder) acc = [...acc, f];
    if (f.fields) acc = [...acc, ...getFieldsWithMediaFolders(f.fields as CmsEntryField[])];
    else if (f.field) acc = [...acc, ...getFieldsWithMediaFolders([f.field as CmsEntryField])];
    else if (f.types) acc = [...acc, ...getFieldsWithMediaFolders(f.types as CmsEntryField[])];
    return acc;
  }, [] as CmsEntryField[]);
}

export function getFileFromSlug(collection: CmsCollectionState, slug: string) {
  return collection.files?.find(f => f.name === slug);
}

export function selectFieldsWithMediaFolders(collection: CmsCollectionState, slug: string) {
  if (collection.folder) {
    return getFieldsWithMediaFolders(collection.fields as CmsEntryField[]);
  } else if (collection.files) {
    const fields = getFileFromSlug(collection, slug)?.fields ?? [];
    return getFieldsWithMediaFolders(fields as CmsEntryField[]);
  }
  return [];
}

export function selectMediaFolders(config: CmsConfig, collection: CmsCollectionState, entry: CmsEntry) {
  const fields = selectFieldsWithMediaFolders(collection, entry.slug);
  const folders = fields.map(f => selectMediaFolder(config, collection, entry, f));
  if (collection.files) {
    const file = getFileFromSlug(collection, entry.slug);
    if (file) {
      folders.unshift(selectMediaFolder(config, collection, entry, undefined));
    }
  }
  if (collection.media_folder) {
    const { files: _files, ...colNoFiles } = collection;
    folders.unshift(selectMediaFolder(config, colNoFiles as CmsCollectionState, entry, undefined));
  }
  return [...new Set(folders)];
}

export function selectFields(collection: CmsCollectionState, slug: string) {
  return selectors[collection.type].fields(collection, slug);
}

export function selectFolderEntryExtension(collection: CmsCollectionState) {
  return selectors[FOLDER].entryExtension(collection);
}

export function selectFileEntryLabel(collection: CmsCollectionState, slug: string) {
  return selectors[FILES].entryLabel(collection, slug);
}

export function selectEntryPath(collection: CmsCollectionState, slug: string) {
  return selectors[collection.type].entryPath(collection, slug);
}

export function selectEntrySlug(collection: CmsCollectionState, path: string) {
  return selectors[collection.type].entrySlug(collection, path);
}

export function selectAllowNewEntries(collection: CmsCollectionState) {
  return selectors[collection.type].allowNewEntries(collection);
}

export function selectAllowDeletion(collection: CmsCollectionState) {
  return selectors[collection.type].allowDeletion(collection);
}

export function selectTemplateName(collection: CmsCollectionState, slug: string) {
  return selectors[collection.type].templateName(collection, slug);
}

export function getFieldsNames(fields: CmsEntryField[], prefix = ''): string[] {
  let names = fields.map(f => `${prefix}${f.name}`);
  fields.forEach((f, index) => {
    if (f.fields) {
      names = [...names, ...getFieldsNames(f.fields as CmsEntryField[], `${names[index]}.`)];
    } else if (f.field) {
      names = [...names, ...getFieldsNames([f.field as CmsEntryField], `${names[index]}.`)];
    } else if (f.types) {
      names = [...names, ...getFieldsNames(f.types as CmsEntryField[], `${names[index]}.`)];
    }
  });
  return names;
}

export function selectField(collection: CmsCollectionState, key: string): CmsEntryField | undefined {
  const array = keyToPathArray(key);
  let name: string | undefined;
  let field: CmsEntryField | undefined;
  let fields = (collection.fields ?? []) as CmsEntryField[];
  while ((name = array.shift()) && fields) {
    field = fields.find(f => f.name === name);
    if (field?.fields) fields = field.fields as CmsEntryField[];
    else if (field?.field) fields = [field.field as CmsEntryField];
    else if (field?.types) fields = field.types as CmsEntryField[];
  }
  return field;
}

export function traverseFields(
  fields: CmsEntryField[],
  updater: (field: CmsEntryField) => CmsEntryField,
  done = () => false,
): CmsEntryField[] {
  if (done()) return fields;
  return fields.map(f => {
    const field = updater(f);
    if (done()) return field;
    if (field.fields)
      return { ...field, fields: traverseFields(field.fields as CmsEntryField[], updater, done) };
    if (field.field)
      return { ...field, field: traverseFields([field.field as CmsEntryField], updater, done)[0] };
    if (field.types)
      return { ...field, types: traverseFields(field.types as CmsEntryField[], updater, done) };
    return field;
  });
}

export function updateFieldByKey(
  collection: CmsCollectionState,
  key: string,
  updater: (field: CmsEntryField) => CmsEntryField,
): CmsCollectionState {
  const selected = selectField(collection, key);
  if (!selected) return collection;

  let updated = false;
  function updateAndBreak(f: CmsEntryField): CmsEntryField {
    if (f === selected) {
      updated = true;
      return updater(f);
    }
    return f;
  }

  return {
    ...collection,
    fields: traverseFields(collection.fields as CmsEntryField[], updateAndBreak, () => updated),
  };
}

export function selectIdentifier(collection: CmsCollectionState) {
  const identifier = collection.identifier_field;
  const identifierFields = identifier ? [identifier, ...IDENTIFIER_FIELDS] : [...IDENTIFIER_FIELDS];
  const fieldNames = getFieldsNames((collection.fields ?? []) as CmsEntryField[]);
  return identifierFields.find(id =>
    fieldNames.find(name => name.toLowerCase().trim() === id.toLowerCase().trim()),
  );
}

export function selectInferredField(collection: CmsCollectionState, fieldName: string) {
  if (fieldName === 'title' && collection.identifier_field) {
    return selectIdentifier(collection);
  }
  const inferableField = (
    INFERABLE_FIELDS as Record<
      string,
      {
        type: string;
        synonyms: string[];
        secondaryTypes: string[];
        fallbackToFirstField: boolean;
        showError: boolean;
      }
    >
  )[fieldName];
  const fields = collection.fields as CmsEntryField[] | undefined;
  if (!fields || !inferableField) return null;

  const mainTypeFields = fields
    .filter(f => (f.widget ?? 'string') === inferableField.type)
    .map(f => f.name);
  let field = mainTypeFields.filter(f => inferableField.synonyms.indexOf(f) !== -1);
  if (field.length > 0) return field[0];

  const secondaryTypeFields = fields
    .filter(f => inferableField.secondaryTypes.indexOf(f.widget ?? 'string') !== -1)
    .map(f => f.name);
  field = secondaryTypeFields.filter(f => inferableField.synonyms.indexOf(f) !== -1);
  if (field.length > 0) return field[0];

  if (inferableField.fallbackToFirstField && mainTypeFields.length > 0) return mainTypeFields[0];

  if (inferableField.showError) {
    console.error(
      `%c ⛔ The Field ${fieldName} is missing for the collection "${collection.name}"\n` +
        `%cDecap CMS tries to infer the entry ${fieldName} automatically, but one couldn't be found for entries of the collection "${collection.name}". Please check your site configuration.`,
      'color: black; font-weight: bold; font-size: 16px; line-height: 50px;',
      'color: black;',
    );
  }
  return null;
}

export function selectEntryCollectionTitle(collection: CmsCollectionState, entry: CmsEntry) {
  const summaryTemplate = collection.summary;
  if (summaryTemplate) return summaryFormatter(summaryTemplate, entry, collection);

  if (collection.type === FILES) {
    const label = selectFileEntryLabel(collection, entry.slug);
    if (label) return label;
  }

  const entryData = entry.data;
  const titleField = selectInferredField(collection, 'title') as string;
  function getNestedValue(obj: any, path: string[]) {
    return path.reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
  }
  const result = titleField && getNestedValue(entryData, keyToPathArray(titleField));
  if (!result && titleField !== 'title') {
    return getNestedValue(entryData, keyToPathArray('title'));
  }
  return result;
}

export function selectDefaultSortableFields(
  collection: CmsCollectionState,
  backend: Backend,
  hasIntegration: boolean,
) {
  let defaultSortable = SORTABLE_FIELDS.map((type: string) => {
    const field = selectInferredField(collection, type);
    if (
      backend.isGitBackend &&
      backend.isGitBackend() &&
      type === 'author' &&
      !field &&
      !hasIntegration
    ) {
      return COMMIT_AUTHOR;
    }
    return field;
  }).filter(Boolean);

  if (backend.isGitBackend && backend.isGitBackend() && !hasIntegration) {
    defaultSortable = [COMMIT_DATE, ...defaultSortable];
  }

  return defaultSortable.map(field => ({ field })) as {
    field: string;
    label?: string;
    default_sort?: boolean | 'asc' | 'desc';
  }[];
}

export function selectSortableFields(collection: CmsCollectionState, t: (key: string) => string) {
  return (collection.sortable_fields ?? [])
    .map(sortableField => {
      const key = sortableField.field;
      const customLabel = sortableField.label;

      if (key === COMMIT_DATE) {
        const label = customLabel || t('collection.defaultFields.updatedOn.label');
        return { key, field: { name: key, label } };
      }
      const field = selectField(collection, key);
      if (key === COMMIT_AUTHOR && !field) {
        const label = customLabel || t('collection.defaultFields.author.label');
        return { key, field: { name: key, label } };
      }

      let fieldObj: Record<string, unknown> | undefined = field ? { ...field } : undefined;
      if (fieldObj && customLabel) fieldObj = { ...fieldObj, label: customLabel };
      if (fieldObj && !fieldObj.label)
        fieldObj = { ...fieldObj, label: (fieldObj.name as string) || key };

      return { key, field: fieldObj };
    })
    .filter(item => !!item.field)
    .map(item => ({ ...item.field, key: item.key }));
}

export function selectDefaultSortField(collection: CmsCollectionState) {
  const sortableFields = collection.sortable_fields ?? [];
  const defaultField = sortableFields.find(field => field.default_sort !== undefined);
  if (!defaultField) return null;

  const fieldName = defaultField.field;
  const defaultSortValue = defaultField.default_sort;
  let direction: string;
  if (defaultSortValue === true || defaultSortValue === 'asc') direction = 'asc';
  else if (defaultSortValue === 'desc') direction = 'desc';
  else direction = 'asc';

  return { field: fieldName, direction };
}

export function selectSortDataPath(collection: CmsCollectionState, key: string) {
  if (key === COMMIT_DATE) return 'updatedOn';
  if (key === COMMIT_AUTHOR && !selectField(collection, key)) return 'author';
  return `data.${key}`;
}

export function selectViewFilters(collection: CmsCollectionState): CmsViewFilter[] {
  return (collection.view_filters ?? []) as CmsViewFilter[];
}

export function selectViewGroups(collection: CmsCollectionState): CmsViewGroup[] {
  return (collection.view_groups ?? []) as CmsViewGroup[];
}

export function selectFieldsComments(collection: CmsCollectionState, entryMap: CmsEntry) {
  let fields: CmsEntryField[] = [];
  if (collection.folder) {
    fields = collection.fields as CmsEntryField[];
  } else if (collection.files) {
    const file = collection.files.find(f => f?.name === entryMap.slug);
    fields = (file?.fields ?? []) as CmsEntryField[];
  }
  const comments: Record<string, string> = {};
  const names = getFieldsNames(fields);
  names.forEach(name => {
    const field = selectField(collection, name);
    if (field?.comment) comments[name] = field.comment as string;
  });
  return comments;
}

export function selectHasMetaPath(collection: CmsCollectionState) {
  return (
    collection.folder &&
    collection.type === FOLDER &&
    collection.meta &&
    collection.meta.path != null
  );
}

export default collections;
