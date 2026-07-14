// decap-cms-widget-richtext
//
// The `richtext` widget for Decap CMS: an emotion-styled Lexical rich-text
// editor. Its value is a lazy
// `LexicalRichtextValue` that derives Portable Text on change and serialises to
// the field's output format (markdown/html/…) once, at persist time.

// The reusable Lexical editor now lives in `lib/widgets/editor` so any widget
// can use it without depending on this widget.
export { Editor } from '@/lib/widgets/editor';

// Decap widget integration: factory, control/preview components, passthrough serializer.
export { LexicalControl, lexicalEditorWidgetSchema, LexicalPreview, passthroughSerializer, Widget } from './widget';
export type { RichtextWidgetDefinition } from './widget';

export * from '@/lib/widgets/editor';
