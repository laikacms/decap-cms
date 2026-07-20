// Temporary scratch config: vitest.config.ts minus the @emotion anchoring
// aliases, to verify they are no longer needed. Safe to delete.
import path from 'path';
import { defineConfig } from 'vitest/config';

import base from './vitest.config';

export default defineConfig({
  ...base,
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
    ],
  },
});
