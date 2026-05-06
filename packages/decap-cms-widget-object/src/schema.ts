import { z } from 'zod';

export default z
  .object({
    collapsed: z.boolean().optional(),
    i18n: z.boolean().optional(),
  })
  .passthrough();
