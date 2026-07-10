// lib-richtext — the editor-agnostic Portable Text core for the decap fork.
// Ported from laika-cms `@laikacloud/portabletext-core`, trimmed to the single
// markdown mapper that bridges Portable Text <-> markdown. See WORKLIST DCB-007.

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

// The one bundled mapper: markdown <-> Portable Text.
export { markdownMapper } from './markdown-mapper';
