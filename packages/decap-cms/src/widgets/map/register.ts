/**
 * Opt-in registration for the map widget. Call `registerMapWidget()` before
 * `init()` so a `widget: map` field works. It is a separate entry point
 * because OpenLayers (`ol`) is an optional peer dependency — only consumers
 * that import this entry (transitively pulling in `./index`, which imports
 * `withMapControl.tsx`, which imports `ol`) need to install it.
 */
import { once } from 'lodash-es';

import { DecapCmsCore as CMS } from '@/core/index';
import DecapCmsWidgetMap from '@/widgets/map/index';

/** Register the map widget. Explicit and idempotent. */
export const registerMapWidget = once(function registerMapWidget(): void {
  CMS.registerWidget(DecapCmsWidgetMap.Widget());
});
