/**
 * Portable Text is the canonical interchange format for the rich-text editor
 * system. We do not hand-roll the data model — these are the official
 * `@portabletext/types`.
 *
 * Ported from laika-cms `@laikacloud/portabletext-core` (the editor-agnostic
 * core) into the decap fork as `lib-richtext`. See WORKLIST DCB-007.
 */
export type {
  ArbitraryTypedObject,
  PortableTextBlock,
  PortableTextBlockStyle,
  PortableTextLink,
  PortableTextListItemBlock,
  PortableTextListItemType,
  PortableTextMarkDefinition,
  PortableTextSpan,
  TypedObject,
} from '@portabletext/types';

import type { ArbitraryTypedObject, PortableTextBlock } from '@portabletext/types';

/**
 * A Portable Text document: an ordered array of blocks. Blocks are either
 * standard text blocks (`_type: 'block'`) or arbitrary typed objects (custom
 * blocks, embeds, …).
 */
export type PortableTextDocument = Array<PortableTextBlock | ArbitraryTypedObject>;
