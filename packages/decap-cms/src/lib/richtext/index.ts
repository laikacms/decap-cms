// lib-richtext — the editor-agnostic Portable Text core for the decap fork.
// Ported from laika-cms `@laikacloud/portabletext-core`. Portable Text is the
// bridge between every rich-text format and the (Portable Text-native)
// Lexical editor widget: one PT <-> format mapper per format, never a
// bespoke format <-> editor mapping. See WORKLIST DCB-007 and DCMS-253.
//
// This barrel is PT-only: no Lexical, no format implementations. The Lexical
// bindings live behind `@/lib/richtext/lexical`; the bundled formats
// (markdown, html, plaintext, mdx) are packs under `@/format-packs/*`. Keeping
// this entry lean is what lets `/laika-app/bare` consumers tree-shake the
// whole editor + parser stack (see FORMAT_PACKS_PLAN.md).

// Portable Text — the canonical interchange format.
export * from './portable-text';

// Mapper interface, registry, detection.
export * from './detect';
export * from './registry';
export * from './types';

// Format packs: a mapper plus optional Lexical extras and block encodings.
export * from './formats';

// Deterministic key helpers (shared by every mapper).
export * from './keys';

// The lazy, editor-agnostic value proxy.
export * from './RichtextValue';

// The Portable Text identity mapper (for values already stored as PT). The
// only mapper bundled here: it is the canonical format and costs nothing.
export { portableTextMapper } from './portable-text-mapper';

// Custom blocks subsystem — the editor-agnostic parts: definitions, registry,
// per-field resolution, and data normalization. The Lexical node/rendering
// side is in `@/lib/richtext/lexical`.
export * from './blocks/registry';
export * from './blocks/resolve';
export * from './blocks/serializeData';
export * from './blocks/types';
