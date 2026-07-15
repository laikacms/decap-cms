import { describe, expect, it } from 'vitest';

import { CommandPrimitive } from '@/ui';
import { CommandPrimitive as CommandPrimitiveDeep } from '@/ui/cmdk';

/**
 * Regression test for DCMS-599: `src/ui/cmdk.tsx` used to be missing from
 * the `src/ui` barrel (`index.ts`), so consumers had to reach in via a
 * deep `@/ui/cmdk` import instead of the documented `@/ui` single-import
 * surface (see `src/ui/README.md`'s re-export policy). This just proves
 * the barrel resolves the primitive; full behavior coverage for `cmdk` is
 * tracked separately under DCMS-600.
 */
describe('cmdk barrel export (DCMS-599)', () => {
  it('resolves CommandPrimitive from the @/ui barrel', () => {
    expect(CommandPrimitive).toBeDefined();
  });

  it('is the same primitive whether imported from @/ui or the deep @/ui/cmdk path', () => {
    expect(CommandPrimitive).toBe(CommandPrimitiveDeep);
  });
});
