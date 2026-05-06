import { z } from 'zod';

const filter = z.object({
  field: z.string(),
  values: z.array(z.union([z.string(), z.boolean(), z.number().int()])).min(1),
});

const baseShape = {
  collection: z.string().optional(),
  value_field: z.string().optional(),
  search_fields: z.array(z.string()).min(1).optional(),
  file: z.string().optional(),
  multiple: z.boolean().optional(),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  display_fields: z.array(z.string()).min(1).optional(),
  options_length: z.number().int().optional(),
  filters: z.array(filter).optional(),
  // Deprecated camelCase aliases retained for backwards compatibility with
  // setSnakeCaseConfig in actions/config.tsx.
  valueField: z.string().optional(),
  searchFields: z.array(z.string()).min(1).optional(),
};

export default z
  .object(baseShape)
  .passthrough()
  .refine(
    val =>
      (val.collection != null && val.value_field != null && val.search_fields != null) ||
      (val.collection != null && val.valueField != null && val.searchFields != null),
    {
      message:
        'must have required properties: collection, value_field/valueField, search_fields/searchFields',
    },
  );
