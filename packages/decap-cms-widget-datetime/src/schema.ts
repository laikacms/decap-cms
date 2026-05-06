import { z } from 'zod';

export default z
  .object({
    format: z.string().optional(),
    date_format: z.union([z.string(), z.boolean()]).optional(),
    time_format: z.union([z.string(), z.boolean()]).optional(),
    picker_utc: z.boolean().optional(),
  })
  .passthrough();
