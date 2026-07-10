// lib-richtext — the editor-agnostic Portable Text core for the decap fork.
// Ported from laika-cms `@laikacloud/portabletext-core`. Portable Text is the
// bridge between every rich-text format and the (Portable Text-native)
// Lexical editor widget: one PT <-> format mapper per format, never a
// bespoke format <-> editor mapping. See WORKLIST DCB-007 and DCMS-253.

// Portable Text — the canonical interchange format.
export * from './portable-text';

// Mapper interface, registry, detection.
export * from './types';
export * from './registry';
export * from './detect';

// Deterministic key helpers (shared by every mapper).
export * from './keys';

// The lazy, editor-agnostic value proxy.
export * from './RichtextValue';

// The bundled mappers: markdown, HTML, plain text <-> Portable Text, plus the
// Portable Text identity mapper (for values already stored as PT).
export { markdownMapper } from './markdown-mapper';
export { htmlMapper } from './html-mapper';
export { plainTextMapper } from './plaintext-mapper';
export { portableTextMapper } from './portable-text-mapper';
