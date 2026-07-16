/**
 * Public widget entry: factory + components + a passthrough widget value
 * serializer registration helper.
 */
import { portableTextMapper, registerMapper } from '@/lib/richtext';
import { LexicalControl } from './control';
import { LexicalPreview } from './preview';
import { lexicalEditorWidgetSchema } from './schema';

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
 * Register output formats at call site via `CMS.registerRichtextFormat(...)`
 * with a pack from `@laikacms/decap-cms/format-packs/*` — only the
 * `portableText` identity mapper is registered here by default (the fat
 * `/app` and `/laika-app` entries register markdown for you). Custom blocks
 * register via `registerBlock(...)`.
 */
export function Widget(): RichtextWidgetDefinition {
  // The Portable Text identity mapper backs nested richtext fields inside
  // custom blocks (their data is stored as PT arrays) and
  // `format: portableText`. Registered here — not at module load — so this
  // module stays side-effect free; creating the widget is the explicit
  // opt-in. It is the ONLY format registered by the widget: output formats
  // (markdown included) ship as packs under `@/format-packs/*` and are
  // registered by the app shell or the consumer
  // (`CMS.registerRichtextFormat(markdownFormat)`).
  registerMapper(portableTextMapper);
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
