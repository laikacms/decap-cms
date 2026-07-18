import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { Statuses } from '@/core/constants/publishModes';

describe('README editorial_workflow status documentation pinning (DCMS-1099)', () => {
  it('documents exactly the `Statuses` key/value pairs from publishModes.ts', () => {
    const readmePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../README.md',
    );
    const readme = readFileSync(readmePath, 'utf-8');

    // Pull the `| `Statuses.KEY` | `value` | ... |` table rows out of the
    // `publish_mode: editorial_workflow` -> Statuses section of src/core/README.md.
    const tableRows = [...readme.matchAll(/^\| `Statuses\.(\w+)`\s*\| `(\w+)`\s*\| .+ \|$/gm)].map(
      match => [match[1], match[2]],
    );

    expect(tableRows).toEqual(Object.entries(Statuses));
  });
});
