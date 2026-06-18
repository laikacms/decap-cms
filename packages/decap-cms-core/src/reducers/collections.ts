import get from 'lodash/get';
import escapeRegExp from 'lodash/escapeRegExp';
import { stringTemplate } from 'decap-cms-lib-widgets';

import consoleError from '../lib/consoleError';
import { CONFIG_SUCCESS } from '../actions/config';
import { FILES, FOLDER } from '../constants/collectionTypes';
import { COMMIT_DATE, COMMIT_AUTHOR } from '../constants/commitProps';
import { INFERABLE_FIELDS, IDENTIFIER_FIELDS, SORTABLE_FIELDS } from '../constants/fieldInference';
import { getFormatExtensions } from '../formats/formats';
import { selectMediaFolder } from './entries';
import { summaryFormatter } from '../lib/formatters';

import type {
  Collection,
  Collections,
  CollectionFiles,
  EntryField,
  EntryMap,
  ViewFilter,
  ViewGroup,
  CmsConfig,
} from '../types/redux';
import type { ConfigAction } from '../actions/config';
import type { Backend } from '../backend';

const { keyToPathArray } = stringTemplate;

const defaultState: Collections = {};

function collections(state = defaultState, action: ConfigAction) {
  switch (action.type) {
    case CONFIG_SUCCESS: {
      const collections = action.payload.collections;
      const newState: Collections = {};
      collections.forEach(collection => {
        newState[collection.name] = collection as unknown as Collection;
      });
      return newState;
    }
    default:
      return state;
  }
}

const selectors = {
  [FOLDER]: {
    entryExtension(collection: Collection) {
      const ext =
        collection.extension || get(getFormatExtensions(), collection.format || 'frontmatter');
      if (!ext) {
        throw new Error(`No extension found for format ${collection.format}`);
      }

      return ext.replace(/^\./, '');
    },
    fields(collection: Collection) {
      return collection.fields;
    },
    entryPath(collection: Collection, slug: string) {
      const folder = (collection.folder as string).replace(/\/$/, '');
      return `${folder}/${slug}.${this.entryExtension(collection)}`;
    },
    entrySlug(collection: Collection, path: string) {
      const folder = (collection.folder as string).replace(/\/$/, '');
      const slug = path
        .split(folder + '/')
        .pop()
        ?.replace(new RegExp(`\\.${escapeRegExp(this.entryExtension(collection))}$`), '');

      return slug;
    },
    allowNewEntries(collection: Collection) {
      return collection.create;
    },
    allowDeletion(collection: Collection) {
      return collection.delete ?? true;
    },
    templateName(collection: Collection) {
      return collection.name;
    },
  },
  [FILES]: {
    fileForEntry(collection: Collection, slug: string) {
      const files = collection.files;
      return files && files.filter(f => f?.name === slug)[0];
    },
    fields(collection: Collection, slug: string) {
      const file = this.fileForEntry(collection, slug);
      return file && file.fields;
    },
    entryPath(collection: Collection, slug: string) {
      const file = this.fileForEntry(collection, slug);
      return file && file.file;
    },
    entrySlug(collection: Collection, path: string) {
      const file = (collection.files as CollectionFiles).filter(f => f?.file === path)[0];
      return file && file.name;
    },
    entryLabel(collection: Collection, slug: string) {
      const file = this.fileForEntry(collection, slug);
      return file && file.label;
    },
    allowNewEntries() {
      return false;
    },
    allowDeletion(collection: Collection) {
      return collection.delete ?? false;
    },
    templateName(_collection: Collection, slug: string) {
      return slug;
    },
  },
};

function getFieldsWithMediaFolders(fields: EntryField[]) {
  const fieldsWithMediaFolders = fields.reduce((acc, f) => {
    if ('media_folder' in f && f.media_folder !== undefined) {
      acc = [...acc, f];
    }

    if ('fields' in f && f.fields) {
      const fields = f.fields as EntryField[];
      acc = [...acc, ...getFieldsWithMediaFolders(fields)];
    } else if ('field' in f && f.field) {
      const field = f.field as EntryField;
      acc = [...acc, ...getFieldsWithMediaFolders([field])];
    } else if ('types' in f && f.types) {
      const types = f.types as EntryField[];
      acc = [...acc, ...getFieldsWithMediaFolders(types)];
    }

    return acc;
  }, [] as EntryField[]);

  return fieldsWithMediaFolders;
}

export function getFileFromSlug(collection: Collection, slug: string) {
  return collection.files?.find(f => f.name === slug);
}

export function selectFieldsWithMediaFolders(collection: Collection, slug: string) {
  if ('folder' in collection && collection.folder) {
    const fields = collection.fields ?? [];
    return getFieldsWithMediaFolders(fields);
  } else if ('files' in collection && collection.files) {
    const fields = getFileFromSlug(collection, slug)?.fields ?? [];
    return getFieldsWithMediaFolders(fields);
  }

  return [];
}

export function selectMediaFolders(config: CmsConfig, collection: Collection, entry: EntryMap) {
  const fields = selectFieldsWithMediaFolders(collection, entry.slug);
  const folders = fields.map(f => selectMediaFolder(config, collection, entry, f));
  if ('files' in collection && collection.files) {
    const file = getFileFromSlug(collection, entry.slug);
    if (file) {
      folders.unshift(selectMediaFolder(config, collection, entry, undefined));
    }
  }
  if ('media_folder' in collection && collection.media_folder !== undefined) {
    // stop evaluating media folders at collection level
    const { files: _, ...collectionWithoutFiles } = collection as Collection & { files?: unknown };
    collection = collectionWithoutFiles as Collection;
    folders.unshift(selectMediaFolder(config, collection, entry, undefined));
  }

  return [...new Set(folders)];
}

export function selectFields(collection: Collection, slug: string) {
  return selectors[collection.type].fields(collection, slug);
}

export function selectFolderEntryExtension(collection: Collection) {
  return selectors[FOLDER].entryExtension(collection);
}

export function selectFileEntryLabel(collection: Collection, slug: string) {
  return selectors[FILES].entryLabel(collection, slug);
}

export function selectEntryPath(collection: Collection, slug: string) {
  return selectors[collection.type].entryPath(collection, slug);
}

export function selectEntrySlug(collection: Collection, path: string) {
  return selectors[collection.type].entrySlug(collection, path);
}

export function selectAllowNewEntries(collection: Collection) {
  return selectors[collection.type].allowNewEntries(collection);
}

export function selectAllowDeletion(collection: Collection) {
  return selectors[collection.type].allowDeletion(collection);
}

export function selectTemplateName(collection: Collection, slug: string) {
  return selectors[collection.type].templateName(collection, slug);
}

export function getFieldsNames(fields: EntryField[], prefix = '') {
  let names = fields.map(f => `${prefix}${f.name}`);

  fields.forEach((f, index) => {
    if ('fields' in f && f.fields) {
      const fields = f.fields as EntryField[];
      names = [...names, ...getFieldsNames(fields, `${names[index]}.`)];
    } else if ('field' in f && f.field) {
      const field = f.field as EntryField;
      names = [...names, ...getFieldsNames([field], `${names[index]}.`)];
    } else if ('types' in f && f.types) {
      const types = f.types as EntryField[];
      names = [...names, ...getFieldsNames(types, `${names[index]}.`)];
    }
  });

  return names;
}

export function selectField(collection: Collection, key: string) {
  const array = keyToPathArray(key);
  let name: string | undefined;
  let field;
  let fields = collection.fields ?? [];
  while ((name = array.shift()) && fields) {
    field = fields.find(f => f.name === name);
    if (field && 'fields' in field && field.fields) {
      fields = field.fields as EntryField[];
    } else if (field && 'field' in field && field.field) {
      fields = [field.field as EntryField];
    } else if (field && 'types' in field && field.types) {
      fields = field.types as EntryField[];
    }
  }

  return field;
}

export function traverseFields(
  fields: EntryField[],
  updater: (field: EntryField) => EntryField,
  done = () => false,
): EntryField[] {
  if (done()) {
    return fields;
  }

  return fields.map(f => {
    const field = updater(f as EntryField);
    if (done()) {
      return field;
    } else if ('fields' in field && field.fields) {
      return { ...field, fields: traverseFields(field.fields!, updater, done) };
    } else if ('field' in field && field.field) {
      return { ...field, field: traverseFields([field.field!], updater, done)[0] };
    } else if ('types' in field && field.types) {
      return { ...field, types: traverseFields(field.types!, updater, done) };
    } else {
      return field;
    }
  });
}

export function updateFieldByKey(
  collection: Collection,
  key: string,
  updater: (field: EntryField) => EntryField,
) {
  const selected = selectField(collection, key);
  if (!selected) {
    return collection;
  }

  let updated = false;

  function updateAndBreak(f: EntryField) {
    const field = f as EntryField;
    if (field === selected) {
      updated = true;
      return updater(field);
    } else {
      return field;
    }
  }

  collection = {
    ...collection,
    fields: traverseFields(collection.fields ?? [], updateAndBreak, () => updated),
  };

  return collection;
}

export function selectIdentifier(collection: Collection) {
  const identifier = collection.identifier_field;
  const identifierFields = identifier ? [identifier, ...IDENTIFIER_FIELDS] : [...IDENTIFIER_FIELDS];
  const fieldNames = getFieldsNames(collection.fields ?? []);
  return identifierFields.find(id =>
    fieldNames.find(name => name.toLowerCase().trim() === id.toLowerCase().trim()),
  );
}

export function selectInferredField(collection: Collection, fieldName: string) {
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
  const fields = collection.fields;
  let field;

  // If collection has no fields or fieldName is not defined within inferables list, return null
  if (!fields || !inferableField) return null;
  // Try to return a field of the specified type with one of the synonyms
  const mainTypeFields = fields
    .filter(f => (f?.widget ?? 'string') === inferableField.type)
    .map(f => f?.name);
  field = mainTypeFields.filter(f => inferableField.synonyms.indexOf(f as string) !== -1);
  if (field && field.length > 0) return field[0];

  // Try to return a field for each of the specified secondary types
  const secondaryTypeFields = fields
    .filter(f => inferableField.secondaryTypes.indexOf((f?.widget ?? 'string') as string) !== -1)
    .map(f => f?.name);
  field = secondaryTypeFields.filter(f => inferableField.synonyms.indexOf(f as string) !== -1);
  if (field && field.length > 0) return field[0];

  // Try to return the first field of the specified type
  if (inferableField.fallbackToFirstField && mainTypeFields.length > 0) return mainTypeFields[0];

  // Coundn't infer the field. Show error and return null.
  if (inferableField.showError) {
    consoleError(
      `The Field ${fieldName} is missing for the collection "${collection.name}"`,
      `Decap CMS tries to infer the entry ${fieldName} automatically, but one couldn't be found for entries of the collection "${collection.name}". Please check your site configuration.`,
    );
  }

  return null;
}

export function selectEntryCollectionTitle(collection: Collection, entry: EntryMap) {
  // prefer formatted summary over everything else
  const summaryTemplate = collection.summary;
  if (summaryTemplate) return summaryFormatter(summaryTemplate, entry, collection);

  // if the collection is a file collection return the label of the entry
  if (collection.type == FILES) {
    const label = selectFileEntryLabel(collection, entry.slug);
    if (label) return label;
  }

  // try to infer a title field from the entry data
  const rawData = entry.data;
  function getInData(path: string[]) {
    return get(rawData as Record<string, unknown>, path);
  }
  const titleField = selectInferredField(collection, 'title');
  const result = titleField && getInData(keyToPathArray(titleField));

  // if the custom field does not yield a result, fallback to 'title'
  if (!result && titleField !== 'title') {
    return getInData(keyToPathArray('title'));
  }

  return result;
}

export function selectDefaultSortableFields(
  collection: Collection,
  backend: Backend,
  hasIntegration: boolean,
) {
  let defaultSortable = SORTABLE_FIELDS.map((type: string) => {
    const field = selectInferredField(collection, type);
    if (backend.isGitBackend() && type === 'author' && !field && !hasIntegration) {
      // default to commit author if not author field is found
      return COMMIT_AUTHOR;
    }
    return field;
  }).filter(Boolean);

  if (backend.isGitBackend() && !hasIntegration) {
    // always have commit date by default
    defaultSortable = [COMMIT_DATE, ...defaultSortable];
  }

  // Return as objects with field property
  return defaultSortable.map(field => ({ field })) as {
    field: string;
    label?: string;
    default_sort?: 'asc' | 'desc';
  }[];
}

export function selectSortableFields(collection: Collection, t: (key: string) => string) {
  const fields = (collection.sortable_fields ?? [])
    .map(sortableField => {
      // Extract the field name and custom label from the sortable field object
      const key = typeof sortableField === 'string' ? sortableField : sortableField.field;
      const customLabel = typeof sortableField === 'string' ? undefined : sortableField.label;

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

      // If custom label is provided, override the field's label
      if (fieldObj && customLabel) {
        fieldObj = { ...fieldObj, label: customLabel };
      }

      // If no label exists at all, use the field name
      if (fieldObj && !fieldObj.label) {
        fieldObj = { ...fieldObj, label: (fieldObj.name as string) || key };
      }

      return { key, field: fieldObj };
    })
    .filter(item => !!item.field)
    .map(item => ({ ...item.field, key: item.key }));

  return fields;
}

export function selectDefaultSortField(collection: Collection) {
  const sortableFields = collection.sortable_fields ?? [];
  // Only treat string 'asc'/'desc' as an active default sort direction.
  // Boolean values (default_sort: true/false) are schema-valid but mean "no default sort".
  const defaultField = sortableFields.find(field => {
    if (typeof field === 'string') return false;
    const v = field.default_sort;
    return v === 'asc' || v === 'desc';
  });

  if (!defaultField) {
    return null;
  }

  if (typeof defaultField === 'string') return null;

  const fieldName = defaultField.field;
  const defaultSortValue = defaultField.default_sort;

  const direction = defaultSortValue === 'desc' ? 'desc' : 'asc';

  return { field: fieldName, direction };
}

export function selectSortDataPath(collection: Collection, key: string) {
  if (key === COMMIT_DATE) {
    return 'updatedOn';
  } else if (key === COMMIT_AUTHOR && !selectField(collection, key)) {
    return 'author';
  } else {
    return `data.${key}`;
  }
}

export function selectViewFilters(collection: Collection) {
  return (collection.view_filters ?? []) as ViewFilter[];
}

export function selectViewGroups(collection: Collection) {
  return (collection.view_groups ?? []) as ViewGroup[];
}

export function selectFieldsComments(collection: Collection, entryMap: EntryMap) {
  let fields: EntryField[] = [];
  if ('folder' in collection && collection.folder) {
    fields = collection.fields ?? [];
  } else if ('files' in collection && collection.files) {
    const file = collection.files!.find(f => f?.name === entryMap.slug);
    fields = file?.fields ?? [];
  }
  const comments: Record<string, string> = {};
  const names = getFieldsNames(fields);
  names.forEach(name => {
    const field = selectField(collection, name);
    if (field && field.comment !== undefined) {
      comments[name] = field.comment!;
    }
  });

  return comments;
}

export function selectHasMetaPath(collection: Collection) {
  return (
    'folder' in collection &&
    collection.folder &&
    collection.type === FOLDER &&
    collection.meta !== undefined &&
    'path' in (collection.meta ?? {})
  );
}

export default collections;
