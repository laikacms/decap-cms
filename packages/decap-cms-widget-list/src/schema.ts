import { z } from 'zod';

export default z
  .object({
    allow_add: z.boolean().optional(),
    allow_remove: z.boolean().optional(),
    allow_reorder: z.boolean().optional(),
    collapsed: z.boolean().optional(),
    summary: z.string().optional(),
    minimize_collapsed: z.boolean().optional(),
    label_singular: z.string().optional(),
    i18n: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .passthrough();
