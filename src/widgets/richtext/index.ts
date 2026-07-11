import {
  createRichtextValue,
  markdownMapper,
  registerMapper,
  RichtextValue,
} from '../../lib/richtext/index';
import RichtextControl from './RichtextControl';
import RichtextPreview from './RichtextPreview';
import { schema } from './schema';

// Register the one Portable Text mapper so `RichtextValue` can resolve the
// `markdown` format on construction. Module-load side effect: the widget is
// always imported before its control/serializer build a `RichtextValue`.
registerMapper(markdownMapper);

/**
 * Decap widget descriptor for the `richtext` widget — the dropped-widget
 * replacement (superstar OD-1). Backed by `@portabletext/editor` via the one
 * Portable Text markdown mapper.
 *
 * The control's value is a `RichtextValue`; the expensive `toString()` runs
 * once at persist time through {@link valueSerializer}, registered via
 * `CMS.registerWidgetValueSerializer('richtext', valueSerializer)`.
 */
function Widget(opts = {}) {
  return {
    name: 'richtext',
    controlComponent: RichtextControl,
    previewComponent: RichtextPreview,
    schema,
    allowMapValue: true,
    ...opts,
  };
}

/**
 * Decap value serializer for the `richtext` widget.
 *
 * - `deserialize` runs on entry load: stored markdown string → `RichtextValue`.
 * - `serialize` runs on persist: `RichtextValue` → markdown string (the single
 *   expensive `toString()`).
 */
const valueSerializer = {
  serialize(value: unknown): string {
    if (value instanceof RichtextValue) return value.toString();
    return typeof value === 'string' ? value : '';
  },
  deserialize(value: unknown): RichtextValue {
    if (value instanceof RichtextValue) return value;
    return createRichtextValue(typeof value === 'string' ? value : '', { hint: 'markdown' });
  },
};

export const DecapCmsWidgetRichtext = {
  Widget,
  controlComponent: RichtextControl,
  previewComponent: RichtextPreview,
  valueSerializer,
};

export { RichtextControl, RichtextPreview, schema, Widget, valueSerializer };

export default DecapCmsWidgetRichtext;
