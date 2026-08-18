import { describe, expect, it } from 'vitest';

import { registerExtensions } from '@/app/extensions';
import { getWidget } from '@/core/lib/registry';

describe('app extensions', () => {
  it('does not register the map widget by default (DCMS-1971)', () => {
    registerExtensions();

    // The map widget ships as the standalone `@laikacms/decap-cms-widget-map`
    // package (extensions/widgets/map). The default app entry must not
    // register it — consumers who need it opt in via
    // `CMS.registerWidget(DecapCmsWidgetMap.Widget())`.
    expect(getWidget('map')).toBeUndefined();
    // Sanity check that registration otherwise ran.
    expect(getWidget('string')).toBeDefined();
  });
});
