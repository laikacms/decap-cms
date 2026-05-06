import { z } from 'zod';

const optionObject = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
});

export default z
  .object({
    multiple: z.boolean().optional(),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
    options: z.array(z.union([z.string(), z.number(), optionObject])),
  })
  .passthrough();
