import { describe, expect, it } from 'vitest';

import { getWidget } from '@/core/lib/registry';
import { registerMapWidget } from '@/widgets/map/register';

describe('registerMapWidget (DCMS-1971)', () => {
  it('is not registered merely by importing the module', () => {
    // `registerMapWidget` is imported above but not yet called at this point
    // in the file — importing must have no side effects on the Registry.
    expect(getWidget('map')).toBeUndefined();
  });

  it('registers the map widget when called, idempotently', () => {
    registerMapWidget();
    registerMapWidget();

    expect(getWidget('map')).toBeDefined();
    expect(getWidget('map')?.name).toBe('map');
  });
});
