import { z } from 'zod';

export default z
  .object({
    default_language: z.string().optional(),
    allow_language_selection: z.boolean().optional(),
    output_code_only: z.boolean().optional(),
    keys: z
      .object({
        code: z.string().optional(),
        lang: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
