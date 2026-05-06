import { z } from 'zod';

export default z
  .object({
    step: z.number().optional(),
    value_type: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .passthrough();
