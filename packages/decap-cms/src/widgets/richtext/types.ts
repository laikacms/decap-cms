/**
 * Structural types for the Plate/remark richtext widget.
 *
 * The serializer pipeline moves a value through four representations:
 * Markdown (string) -> MDAST -> Slate Raw AST -> MDAST -> Markdown. The two
 * ASTs are open, dynamically shaped trees: every transform reads a handful of
 * optional properties and copies the rest through untouched. Modelling them as
 * closed discriminated unions would mean a union member (and a narrowing step)
 * per node type in code whose whole job is to be type-agnostic, so instead each
 * AST gets one wide interface whose properties are exactly the ones the
 * transforms read. Nothing here is cast; unknown extras stay unknown.
 */

import type { CmsFieldBase, CmsFieldRichtext } from '@/lib/util/index';
import type { ComponentType, ReactElement } from 'react';

/**
 * The field this widget renders. `media_library` is not on `CmsFieldBase` (it
 * belongs to the media widgets), but a richtext field may carry one to hand
 * down to its image editor component, so it is declared here.
 */
export type RichtextField = CmsFieldBase & CmsFieldRichtext & {
  media_library?: Record<string, unknown>,
};

/** The four inline marks this widget round-trips. */
export type SlateMarkName = 'bold' | 'italic' | 'strikethrough' | 'code';

export interface SlateMark {
  type: SlateMarkName;
}

/** Values collected by an editor component's `fromBlock`, keyed by field name. */
export type ShortcodeData = Record<string, unknown>;

/**
 * MDAST node. A superset of the legacy (remark 6) node types this pipeline
 * encounters, flattened into one interface. `children`/`value` are optional
 * because leaf and parent nodes share the shape.
 */
export interface MdastNode {
  type: string;
  value?: string | undefined;
  children?: MdastNode[] | undefined;
  data?: MdastData | undefined;
  /** heading */
  depth?: number | undefined;
  /** code */
  lang?: string | null | undefined;
  /** list */
  ordered?: boolean | undefined;
  start?: number | null | undefined;
  spread?: boolean | undefined;
  checked?: boolean | null | undefined;
  /** table */
  align?: Array<string | null> | undefined;
  /** link / image */
  url?: string | undefined;
  title?: string | null | undefined;
  alt?: string | null | undefined;
  /** linkReference / imageReference / definition */
  identifier?: string | undefined;
  /** remark attaches source positions; carried through opaquely. */
  position?: unknown | undefined;
}

export interface MdastData {
  /** id of the editor component that produced this node */
  shortcode?: string | undefined;
  shortcodeData?: ShortcodeData | undefined;
  /** marks inherited from ancestor mark nodes while flattening */
  marks?: SlateMark[] | undefined;
  [key: string]: unknown;
}

export interface MdastRoot extends MdastNode {
  type: 'root';
  children: MdastNode[];
}

/**
 * Slate Raw AST node. Text nodes carry `text` plus a boolean per active mark;
 * element nodes carry `type` and `children`. Both live in one interface for the
 * same reason as `MdastNode`: the transforms walk mixed arrays of them.
 */
export interface SlateNode {
  type?: string | undefined;
  text?: string | undefined;
  children?: SlateNode[] | undefined;
  data?: SlateNodeData | undefined;
  /**
   * Mark list kept alongside the boolean flags. Plate reads the booleans; the
   * serializers read this list because they need mark ordering.
   */
  marks?: SlateMark[] | undefined;
  bold?: boolean | undefined;
  italic?: boolean | undefined;
  strikethrough?: boolean | undefined;
  code?: boolean | undefined;
  /**
   * Plate's link plugin stores the href on the element itself, while this
   * widget's own deserializer stores it in `data`. Both are read on the way
   * back out to markdown, with `data` winning.
   */
  url?: string | undefined;
  title?: string | null | undefined;
}

/** A complete text node accepted by Plate. */
export interface RichTextText extends Omit<SlateNode, 'children' | 'text' | 'type'> {
  text: string;
  [key: string]: unknown;
}

/** A complete element node accepted by Plate. */
export interface RichTextElement extends Omit<SlateNode, 'children' | 'text' | 'type'> {
  type: string;
  children: RichTextDescendant[];
  [key: string]: unknown;
}

export type RichTextDescendant = RichTextElement | RichTextText;
export type RichTextValue = RichTextElement[];

export interface SlateNodeData {
  shortcode?: string | undefined;
  shortcodeData?: ShortcodeData | undefined;
  /** set when a shortcode was just inserted from the toolbar */
  shortcodeNew?: boolean | undefined;
  /** id of the editor component, mirrored from `shortcode` */
  id?: string | undefined;
  marks?: SlateMark[] | undefined;
  url?: string | undefined;
  title?: string | null | undefined;
  alt?: string | null | undefined;
  lang?: string | null | undefined;
  /** void code blocks keep their source here instead of in a text child */
  code?: string | undefined;
  start?: number | null | undefined;
  align?: Array<string | null> | undefined;
  metadata?: unknown | undefined;
  [key: string]: unknown;
}

export type GetAssetFunction = (path: string, field?: unknown) => unknown;

export interface WidgetPreviewProps {
  value: unknown;
  field: unknown;
  getAsset?: GetAssetFunction | undefined;
}

export type ResolveWidgetFunction = (
  name: string,
) => { preview?: ComponentType<WidgetPreviewProps>, control?: unknown } | undefined;

/** A single field definition inside an editor component. */
export interface EditorComponentField {
  name: string;
  widget?: string | undefined;
  label?: string | undefined;
  default?: unknown | undefined;
  [key: string]: unknown;
}

/** Parses a matched markdown block into the component's field values. */
export type FromBlock = (match: RegExpMatchArray) => ShortcodeData;

/** Serializes the component's field values back to a markdown block. */
export type ToBlock = (data: ShortcodeData) => string;

/** Renders the component's field values for the preview pane. */
export type ToPreview = (
  data: ShortcodeData,
  getAsset?: GetAssetFunction | undefined,
  fields?: EditorComponentField[] | undefined,
) => string | ReactElement;

/** What a consumer passes to `registerEditorComponent`. */
export interface EditorComponentOptions {
  id?: string | undefined;
  label?: string | undefined;
  icon?: string | undefined;
  type?: string | undefined;
  widget?: string | undefined;
  pattern?: RegExp | undefined;
  fields?: EditorComponentField[] | undefined;
  fromBlock?: FromBlock | undefined;
  toBlock?: ToBlock | undefined;
  toPreview?: ToPreview | undefined;
  [key: string]: unknown;
}

/** A normalized, registered editor component. */
export interface EditorComponent {
  id: string;
  label: string;
  type: string;
  icon: string;
  widget: string;
  pattern: RegExp;
  fields: EditorComponentField[];
  fromBlock: FromBlock;
  toBlock: ToBlock;
  toPreview?: ToPreview | undefined;
  [key: string]: unknown;
}

/**
 * Registered editor components, keyed by id. A native `Map` stands in for
 * upstream's Immutable `OrderedMap`: insertion order is part of the contract
 * because the shortcode tokenizer matches by first registered plugin.
 */
export type EditorComponentsRegistry = Map<string, EditorComponent>;
