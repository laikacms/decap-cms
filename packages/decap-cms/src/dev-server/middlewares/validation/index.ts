import type { DevServerRequest, DevServerResponse, NextFunction } from '@/dev-server/app';

const allowedActions = [
  'info',
  'entriesByFolder',
  'entriesByFiles',
  'getEntry',
  'unpublishedEntries',
  'unpublishedEntry',
  'unpublishedEntryDataFile',
  'unpublishedEntryMediaFile',
  'deleteUnpublishedEntry',
  'persistEntry',
  'updateUnpublishedEntryStatus',
  'publishUnpublishedEntry',
  'getMedia',
  'getMediaFile',
  'persistMedia',
  'deleteFile',
  'deleteFiles',
  'getDeployPreview',
] as const;

type Action = (typeof allowedActions)[number];

export interface ValidationResult {
  error?: {
    details: Array<{ message: string }>,
  };
}

export interface ValidationSchema {
  validate(value: unknown): ValidationResult;
}

type Path = PropertyKey[];
type StringValidator = (value: string) => string | undefined;

interface Rule {
  check(value: unknown, path: Path): string | undefined;
  optional(): Rule;
}

function pathLabel(path: Path): string {
  return path.reduce<string>((label, segment) => {
    if (typeof segment === 'number') return `${label}[${segment}]`;
    return label ? `${label}.${String(segment)}` : String(segment);
  }, '');
}

function makeRule(check: Rule['check']): Rule {
  return {
    check,
    optional() {
      return makeRule((value, path) => value === undefined ? undefined : check(value, path));
    },
  };
}

function required(type: string, predicate: (value: unknown) => boolean, validate?: StringValidator): Rule {
  return makeRule((value, path) => {
    const label = pathLabel(path);
    if (value === undefined) return `"${label}" is required`;
    if (!predicate(value)) return `"${label}" must be a ${type}`;
    if (validate) {
      const message = validate(value as string);
      if (message) return `"${label}" ${message}`;
    }
    return undefined;
  });
}

const requiredString = required('string', value => typeof value === 'string');
const requiredNumber = required('number', value => typeof value === 'number' && Number.isFinite(value));
const requiredBool = required('boolean', value => typeof value === 'boolean');

function string(validate?: StringValidator): Rule {
  return required('string', value => typeof value === 'string', validate);
}

function literal(expected: string): Rule {
  return makeRule((value, path) => {
    const label = pathLabel(path);
    if (value === undefined) return `"${label}" is required`;
    return value === expected ? undefined : `"${label}" must be one of [${expected}]`;
  });
}

function array(item: Rule, minimum = 0): Rule {
  return makeRule((value, path) => {
    const label = pathLabel(path);
    if (value === undefined) return `"${label}" is required`;
    if (!Array.isArray(value)) return `"${label}" must be an array`;
    if (value.length < minimum) return `"${label}" must contain at least ${minimum} items`;
    for (const [index, entry] of value.entries()) {
      const issue = item.check(entry, [...path, index]);
      if (issue) return issue;
    }
    return undefined;
  });
}

function object(
  shape: Record<string, Rule>,
  refine?: (value: Record<string, unknown>, path: Path) => string | undefined,
): Rule {
  return makeRule((value, path) => {
    const label = pathLabel(path);
    if (value === undefined) return `"${label}" is required`;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return `"${label}" must be an object`;
    }
    for (const [key, rule] of Object.entries(shape)) {
      const issue = rule.check((value as Record<string, unknown>)[key], [...path, key]);
      if (issue) return issue;
    }
    return refine?.(value as Record<string, unknown>, path);
  });
}

function extend(base: Record<string, Rule>, additions: Record<string, Rule>): Record<string, Rule> {
  return { ...base, ...additions };
}

function validateWithRule(rule: Rule, value: unknown, prefix: Path = []): ValidationResult {
  const message = rule.check(value, prefix);
  return message ? { error: { details: [{ message }] } } : {};
}

export function defaultSchema({ path: validatePath }: { path?: StringValidator } = {}) {
  const path = string(validatePath);
  const defaultParams = { branch: requiredString };
  const asset = object({
    path,
    content: requiredString,
    encoding: literal('base64'),
  });
  const dataFile = object({
    slug: requiredString,
    path,
    raw: requiredString,
    newPath: path.optional(),
  });

  const paramsSchemas: Record<Action, Rule | undefined> = {
    info: undefined,
    entriesByFolder: object(extend(defaultParams, {
      folder: path,
      extension: requiredString,
      depth: requiredNumber,
    })),
    entriesByFiles: object(extend(defaultParams, {
      files: array(object({ path, label: requiredString.optional() })),
    })),
    getEntry: object(extend(defaultParams, { path })),
    unpublishedEntries: object(defaultParams),
    unpublishedEntry: object(extend(defaultParams, {
      id: requiredString.optional(),
      collection: requiredString.optional(),
      slug: requiredString.optional(),
      cmsLabelPrefix: requiredString.optional(),
    })),
    unpublishedEntryDataFile: object(extend(defaultParams, {
      collection: requiredString,
      slug: requiredString,
      id: requiredString,
      path,
    })),
    unpublishedEntryMediaFile: object(extend(defaultParams, {
      collection: requiredString,
      slug: requiredString,
      id: requiredString,
      path,
    })),
    deleteUnpublishedEntry: object(extend(defaultParams, {
      collection: requiredString,
      slug: requiredString,
    })),
    persistEntry: object(
      extend(defaultParams, {
        cmsLabelPrefix: requiredString.optional(),
        entry: dataFile.optional(),
        dataFiles: array(dataFile).optional(),
        assets: array(asset),
        options: object({
          collectionName: requiredString.optional(),
          commitMessage: requiredString,
          useWorkflow: requiredBool,
          status: requiredString,
        }),
      }),
      (params, prefix) => {
        const supplied = Number(params.entry !== undefined) + Number(params.dataFiles !== undefined);
        if (supplied === 0) {
          return `"${pathLabel(prefix)}" must contain at least one of [entry, dataFiles]`;
        }
        return supplied > 1
          ? `"${pathLabel(prefix)}" contains a conflict between exclusive peers [entry, dataFiles]`
          : undefined;
      },
    ),
    updateUnpublishedEntryStatus: object(extend(defaultParams, {
      collection: requiredString,
      slug: requiredString,
      newStatus: requiredString,
      cmsLabelPrefix: requiredString.optional(),
    })),
    publishUnpublishedEntry: object(extend(defaultParams, {
      collection: requiredString,
      slug: requiredString,
    })),
    getMedia: object(extend(defaultParams, { mediaFolder: path })),
    getMediaFile: object(extend(defaultParams, { path })),
    persistMedia: object(extend(defaultParams, {
      asset,
      options: object({ commitMessage: requiredString }),
    })),
    deleteFile: object(extend(defaultParams, {
      path,
      options: object({ commitMessage: requiredString }),
    })),
    deleteFiles: object(extend(defaultParams, {
      paths: array(path, 1),
      options: object({ commitMessage: requiredString }),
    })),
    getDeployPreview: object(extend(defaultParams, {
      collection: requiredString,
      slug: requiredString,
    })),
  };

  return {
    validate(input: unknown): ValidationResult {
      if (input === null || typeof input !== 'object') {
        return { error: { details: [{ message: '"action" is required' }] } };
      }

      const action = (input as { action?: unknown }).action;
      if (action === undefined) {
        return { error: { details: [{ message: '"action" is required' }] } };
      }
      if (typeof action !== 'string' || !allowedActions.includes(action as Action)) {
        return {
          error: {
            details: [{ message: `"action" must be one of [${allowedActions.join(', ')}]` }],
          },
        };
      }

      const paramsSchema = paramsSchemas[action as Action];
      if (!paramsSchema) return {};

      const params = (input as { params?: unknown }).params;
      if (params === undefined) {
        return { error: { details: [{ message: '"params" is required' }] } };
      }
      return validateWithRule(paramsSchema, params, ['params']);
    },
  } satisfies ValidationSchema;
}

export function validateRequest(schema: ValidationSchema) {
  return (req: DevServerRequest, res: DevServerResponse, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(',');
      res.status(422).json({ error: message });
    } else {
      next();
    }
  };
}
