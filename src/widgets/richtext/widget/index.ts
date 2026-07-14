/**
 * Public widget entry: factory + components + a passthrough widget value
 * serializer registration helper.
 */
import { markdownMapper, registerMapper } from '@/lib/richtext';
import { LexicalControl } from './control';
import { LexicalPreview } from './preview';
import { lexicalEditorWidgetSchema } from './schema';

// Register the default Portable Text mapper so a `LexicalRichtextValue` can
// resolve the `markdown` format on construction. Module-load side effect: the
// widget is always imported before its control/serializer build a value.
registerMapper(markdownMapper);

export { LexicalControl, lexicalEditorWidgetSchema, LexicalPreview };

export interface RichtextWidgetDefinition {
  name: 'richtext';
  controlComponent: typeof LexicalControl;
  previewComponent: typeof LexicalPreview;
  schema: typeof lexicalEditorWidgetSchema;
  allowMapValue: true;
}

/**
 * Widget factory. Pass the result to `CMS.registerWidget(...)`.
 *
 * Also wire the passthrough value serializer with
 * `CMS.registerWidgetValueSerializer('richtext', passthroughSerializer)` so
 * Decap's `serializeValues()` doesn't stringify the `RichtextValue` early —
 * `toString()` fires once, at file-write time.
 *
 * Register any additional output formats you want at call site via
 * `registerMapper(...)` from `../../../lib/richtext` — only `markdown` is
 * registered here by default.
 */
export function Widget(): RichtextWidgetDefinition {
  return {
    name: 'richtext',
    controlComponent: LexicalControl,
    previewComponent: LexicalPreview,
    schema: lexicalEditorWidgetSchema,
    allowMapValue: true,
  };
}

/** A passthrough serializer so the lazy proxy survives Decap's value pipeline. */
export const passthroughSerializer = {
  serialize: <T>(value: T): T => value,
  deserialize: <T>(value: T): T => value,
};

export default Widget;
