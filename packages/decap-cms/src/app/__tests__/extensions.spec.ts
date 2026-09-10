import { describe, expect, it } from 'vitest';

import { registerExtensions } from '@/app/extensions';
import { getWidget } from '@/core/lib/registry';

describe('app extensions', () => {
  it('registers the map widget by default', () => {
    registerExtensions();

    // The map widget is bundled and registered by the default app entry, as
    // it was in v3, so a v3 config using `widget: map` keeps working on
    // upgrade with no install and no registration call. DCMS-1971 had split
    // it out to `extensions/widgets/map`; that split was reversed because the
    // break landed at runtime in the editor rather than at build time.
    expect(getWidget('map')).toBeDefined();
    // Sanity check that registration otherwise ran.
    expect(getWidget('string')).toBeDefined();
  });
});
