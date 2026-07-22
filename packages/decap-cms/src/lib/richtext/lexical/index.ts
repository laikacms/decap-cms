// lib-richtext/lexical — the Lexical bindings for the Portable Text core.
//
// Split out of `@/lib/richtext` so the PT core stays editor-free: importing
// the core barrel (as `core/lib/registry` does) must not pull `lexical` and
// its plugin packages into every bundle. Only the editor surfaces
// (`ui/editor`, the `richtext` widget) import from here.
//
// The Lexical editor is Portable Text-native: it derives canonical PT from
// its editor state on change and serialises to the field's format only at
// persist time.

// Custom blocks subsystem — the Lexical/rendering side: nodes, insertion,
// the block-render context, and the decorator component.
export * from '@/lib/richtext/blocks/BlockComponent';
export * from '@/lib/richtext/blocks/BlockNode';
export * from '@/lib/richtext/blocks/blocksContext';
export * from '@/lib/richtext/blocks/historyCoalesce';
export * from '@/lib/richtext/blocks/InlineBlockNode';
export * from '@/lib/richtext/blocks/insert';

// Lexical node set and headless editor.
export * from './headlessEditor';
export * from './nodes';

// Portable Text <-> Lexical bridge.
export * from '@/lib/richtext/bridge/empty';
export * from '@/lib/richtext/bridge/lexicalToPortableText';
export * from '@/lib/richtext/bridge/marks';
export * from '@/lib/richtext/bridge/portableTextToLexical';
export * from '@/lib/richtext/bridge/source';
export * from '@/lib/richtext/bridge/types';

// Lexical-bound `RichtextValue` subclass (carries `editorState` and derives
// canonical PT from it on change).
export * from '@/lib/richtext/value/LexicalRichtextValue';
