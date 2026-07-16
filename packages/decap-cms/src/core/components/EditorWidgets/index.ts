import { once } from 'lodash-es';

import { registerWidget } from '@/core/lib/registry';
import UnknownControl from './Unknown/UnknownControl';
import UnknownPreview from './Unknown/UnknownPreview';

/**
 * Register the built-in `unknown` widget (the fallback control/preview for
 * unrecognized widget names). Called by `DecapCmsProvider` — this module has
 * no import-time side effects, so registration is explicit and idempotent.
 */
export const registerCoreWidgets = once(function registerCoreWidgets(): void {
  registerWidget({
    name: 'unknown',
    controlComponent: UnknownControl as any,
    previewComponent: UnknownPreview as any,
  });
});
