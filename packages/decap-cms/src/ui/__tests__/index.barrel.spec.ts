import path from 'path';
import { describe, expect, it } from 'vitest';

import * as uiBarrel from '@/ui';
import indexSource from '@/ui/index.ts?raw';

const primitiveModules = import.meta.glob('../*.tsx', { eager: false });

/**
 * Pinning test for the `src/ui/README.md` "only barrel" contract: every
 * top-level primitive file (`src/ui/*.tsx`) that exports at least one
 * PascalCase component/function must be re-exported from `index.ts`.
 * Filed under DCMS-666 after `AlertDialog` was found to be a physical
 * primitive file with no `export * from './AlertDialog'` line.
 */
describe('src/ui/index.ts barrel completeness', () => {
  const primitiveFiles = Object.keys(primitiveModules)
    .map(p => path.basename(p))
    .filter(name => /^[A-Z][A-Za-z]*\.tsx?$/.test(name));

  it.each(primitiveFiles)('%s is re-exported from index.ts', fileName => {
    const primitiveName = fileName.replace(/\.tsx?$/, '');
    const reExportPattern = new RegExp(
      `export \\* from ['"]\\./${primitiveName}['"]`,
    );

    expect(indexSource).toMatch(reExportPattern);
  });

  it('exports AlertDialog primitives, including the imperative confirmDialog/showAlert helpers', () => {
    expect(uiBarrel.AlertDialog).toBeTypeOf('function');
    expect(uiBarrel.AlertDialogContent).toBeTypeOf('function');
    expect(uiBarrel.confirmDialog).toBeTypeOf('function');
    expect(uiBarrel.showAlert).toBeTypeOf('function');
  });
});
