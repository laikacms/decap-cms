import { z } from 'zod';

import type express from 'express';

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
    details: Array<{ message: string }>;
  };
}

export interface ValidationSchema {
  validate(value: unknown): ValidationResult;
}

const requiredString = z.string();
const requiredNumber = z.number();
const requiredBool = z.boolean();

function object<T extends z.core.$ZodShape>(shape: T) {
  return z.object(shape).passthrough();
}

function valueAtPath(input: unknown, path: PropertyKey[]): unknown {
  let value = input;
  for (const segment of path) {
    if (value === null || typeof value !== 'object') return undefined;
    value = (value as Record<PropertyKey, unknown>)[segment];
  }
  return value;
}

function pathLabel(path: PropertyKey[]): string {
  return path.reduce<string>((label, segment) => {
    if (typeof segment === 'number') return `${label}[${segment}]`;
    return label ? `${label}.${String(segment)}` : String(segment);
  }, '');
}

function issueMessage(
  issue: z.ZodError['issues'][number],
  input: unknown,
  prefix: PropertyKey[] = [],
): string {
  const path = [...prefix, ...issue.path];
  const label = pathLabel(path);
  const value = valueAtPath(input, path);

  if (value === undefined) return `"${label}" is required`;
  if (issue.code === 'invalid_type') {
    const expected = issue.expected;
    const article = expected === 'array' ? 'an' : 'a';
    return `"${label}" must be ${article} ${expected}`;
  }
  if (issue.code === 'too_small' && issue.origin === 'array') {
    return `"${label}" must contain at least ${issue.minimum} items`;
  }
  if (issue.code === 'invalid_value') {
    return `"${label}" must be one of [${issue.values.join(', ')}]`;
  }

  return `"${label}" ${issue.message}`;
}

function validateWithSchema(
  schema: z.ZodType,
  value: unknown,
  input: unknown,
  prefix: PropertyKey[] = [],
): ValidationResult {
  const result = schema.safeParse(value);
  if (result.success) return {};

  const issue = result.error.issues[0];
  return { error: { details: [{ message: issueMessage(issue, input, prefix) }] } };
}

export function defaultSchema({ path = requiredString }: { path?: z.ZodType<string> } = {}) {
  const defaultParams = object({ branch: requiredString });
  const asset = object({
    path,
    content: requiredString,
    encoding: z.literal('base64'),
  });
  const dataFile = object({
    slug: requiredString,
    path,
    raw: requiredString,
    newPath: path.optional(),
  });

  const paramsSchemas: Record<Action, z.ZodType | undefined> = {
    info: undefined,
    entriesByFolder: defaultParams.extend({
      folder: path,
      extension: requiredString,
      depth: requiredNumber,
    }),
    entriesByFiles: defaultParams.extend({
      files: z.array(object({ path, label: z.string().optional() })),
    }),
    getEntry: defaultParams.extend({ path }),
    unpublishedEntries: defaultParams,
    unpublishedEntry: defaultParams.extend({
      id: z.string().optional(),
      collection: z.string().optional(),
      slug: z.string().optional(),
      cmsLabelPrefix: z.string().optional(),
    }),
    unpublishedEntryDataFile: defaultParams.extend({
      collection: requiredString,
      slug: requiredString,
      id: requiredString,
      path,
    }),
    unpublishedEntryMediaFile: defaultParams.extend({
      collection: requiredString,
      slug: requiredString,
      id: requiredString,
      path,
    }),
    deleteUnpublishedEntry: defaultParams.extend({
      collection: requiredString,
      slug: requiredString,
    }),
    persistEntry: defaultParams
      .extend({
        cmsLabelPrefix: z.string().optional(),
        entry: dataFile.optional(),
        dataFiles: z.array(dataFile).optional(),
        assets: z.array(asset),
        options: object({
          collectionName: z.string().optional(),
          commitMessage: requiredString,
          useWorkflow: requiredBool,
          status: requiredString,
        }),
      })
      .superRefine((params, context) => {
        const supplied =
          Number(params.entry !== undefined) + Number(params.dataFiles !== undefined);
        if (supplied === 0) {
          context.addIssue({
            code: 'custom',
            message: 'must contain at least one of [entry, dataFiles]',
          });
        } else if (supplied > 1) {
          context.addIssue({
            code: 'custom',
            message: 'contains a conflict between exclusive peers [entry, dataFiles]',
          });
        }
      }),
    updateUnpublishedEntryStatus: defaultParams.extend({
      collection: requiredString,
      slug: requiredString,
      newStatus: requiredString,
      cmsLabelPrefix: z.string().optional(),
    }),
    publishUnpublishedEntry: defaultParams.extend({
      collection: requiredString,
      slug: requiredString,
    }),
    getMedia: defaultParams.extend({ mediaFolder: path }),
    getMediaFile: defaultParams.extend({ path }),
    persistMedia: defaultParams.extend({
      asset,
      options: object({ commitMessage: requiredString }),
    }),
    deleteFile: defaultParams.extend({
      path,
      options: object({ commitMessage: requiredString }),
    }),
    deleteFiles: defaultParams.extend({
      paths: z.array(path).min(1),
      options: object({ commitMessage: requiredString }),
    }),
    getDeployPreview: defaultParams.extend({
      collection: requiredString,
      slug: requiredString,
    }),
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
      return validateWithSchema(paramsSchema, params, input, ['params']);
    },
  } satisfies ValidationSchema;
}

export function validateRequest(schema: ValidationSchema) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(',');
      res.status(422).json({ error: message });
    } else {
      next();
    }
  };
}
