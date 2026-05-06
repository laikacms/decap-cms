import { z } from 'zod';

export default z
  .object({
    decimals: z.number().int().optional(),
    type: z.enum(['Point', 'LineString', 'Polygon']).optional(),
  })
  .passthrough();
