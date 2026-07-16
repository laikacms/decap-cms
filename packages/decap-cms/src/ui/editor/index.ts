// Reusable Lexical editor
//
// A self-contained, emotion-styled Lexical rich-text editor.
// It has no dependency on any particular widget, so
// any widget can mount `<Editor>` and drive it via serialized editor state
// without reaching into another widget's folder.

export { Editor } from './Editor';

export * from './themes/editor-theme';
export * from './themes/GlobalStyles';

export * from './utils/doc-serialization';
export * from './utils/emoji-list';
export * from './utils/get-dom-range-rect';
export * from './utils/get-selected-node';
export * from './utils/guard';
export * from './utils/set-floating-elem-position';
export * from './utils/set-floating-elem-position-for-link-editor';
export * from './utils/swipe';
export * from './utils/url';
