// decap-cms-widget-richtext
//
// The `richtext` widget for Decap CMS: an emotion-styled Lexical rich-text
// editor. Its value is a lazy
// `LexicalRichtextValue` that derives Portable Text on change and serialises to
// the field's output format (markdown/html/…) once, at persist time.

// The reusable Lexical editor now lives in `ui/editor` so any widget
// can use it without depending on this widget.
export { Editor } from '@/ui/editor';

// Decap widget integration: factory, control/preview components, passthrough serializer.
export { LexicalControl, lexicalEditorWidgetSchema, LexicalPreview, passthroughSerializer, Widget } from './widget';
export type { RichtextWidgetDefinition } from './widget';

// Bundled block definitions (embeds). Registered by the app shells via
// `CMS.registerBlock`; exported so call sites can spread-override (e.g. a
// different markdown shortcode) before registering.
export { tweetBlock } from './blocks/tweet';
export { youtubeBlock } from './blocks/youtube';

export * from '@/ui/editor';
