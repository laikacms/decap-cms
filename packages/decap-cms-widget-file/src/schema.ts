import { z } from 'zod';

export default z
  .object({
    allow_multiple: z.boolean().optional(),
  })
  .passthrough();
