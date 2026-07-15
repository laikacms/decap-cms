import type { ComponentType, ReactNode } from 'react';
import type { NodeKey } from 'lexical';

/** Arbitrary serializable data carried by a custom block. */
export type BlockData = Record<string, unknown>;

/** Resolves an asset reference (e.g. an image path) to a usable URL. */
export type GetAssetFn = (value: string, field?: unknown) => string;

/**
 * A decap field config editing one block property. Passed through to the
 * widget resolver untyped; any widget-specific options ride along.
 */
export interface BlockFieldConfig {
  name: string;
  label?: string;
  widget?: string;
  [key: string]: unknown;
}

/**
 * Serialization codec for one block in one text-based format.
 *
 * `pattern` is matched against the source at block boundaries (start of the
 * document or start of a line); it may span multiple lines (use the `s` flag
 * for container-style blocks). Earliest match wins; ties go to block
 * registration order.
 */
export interface BlockFormatCodec<TData extends BlockData = BlockData> {
  pattern: RegExp;
  /** Parse a pattern match into block data. */
  fromMatch(match: RegExpMatchArray): TData;
  /** Serialize block data back to source text (no trailing newline). */
  serialize(data: TData): string;
}

/** Props passed to a block's preview component (editor and preview pane). */
export interface BlockPreviewProps<TData extends BlockData = BlockData> {
  data: TData;
  definition: BlockDefinition<TData>;
  getAsset?: GetAssetFn;
  /** True when rendered as a PT inline object. */
  inline?: boolean;
}

/**
 * A PT-native custom block: a React preview plus props edited with decap
 * widgets. Stored in Portable Text as `{_type: id, _key, ...data}`; carried
 * through the editor as a `decap-block` / `decap-inline-block` Lexical node.
 */
export interface BlockDefinition<TData extends BlockData = BlockData> {
  /** PT `_type` and stable id. Reserved PT types are rejected on register. */
  id: string;
  label?: string;
  /** Icon for the slash menu / toolbar / block chrome. */
  icon?: ReactNode;
  /** Inline object (child of a text block) instead of block-level. */
  inline?: boolean;
  /** Decap fields editing the block data. Empty array = no editable props. */
  fields: BlockFieldConfig[];
  defaultData?: TData | (() => TData);
  /** Extra slash-menu search keywords. */
  keywords?: string[];
  /** Preview inside the editor AND the preview pane. Fallback chrome if absent. */
  preview?: ComponentType<BlockPreviewProps<TData>>;
  /**
   * Names of nested-PT props editable in place. Reserved for the visual
   * editor; currently unused.
   */
  editableRegions?: string[];
  /**
   * Per-format serialization, keyed by format (mapper) id. The `markdown`
   * entry is a {@link BlockFormatCodec}; other formats define their own bag
   * (e.g. the MDX pack reads `{name?, serialize?, parseAttributes?}`).
   */
  formats?: { markdown?: BlockFormatCodec<TData>; [formatId: string]: unknown };
}

/** Props for the inline block prop form injected by the widget layer. */
export interface BlockFormRenderProps {
  definition: BlockDefinition;
  value: BlockData;
  onChange(next: BlockData): void;
  onClose(): void;
}

/** Props for the chrome wrapping a block inside the Lexical editor. */
export interface BlockChromeProps {
  /** Undefined when the block's `componentId` has no registered definition. */
  definition: BlockDefinition | undefined;
  componentId: string;
  data: BlockData;
  nodeKey: NodeKey;
  inline: boolean;
  isEditing: boolean;
  openEditor(): void;
  closeEditor(): void;
  /** Commit new data onto the underlying Lexical node. */
  updateData(next: BlockData): void;
}

/** Configuration supplied to the blocks subsystem via `BlocksProvider`. */
export interface BlocksConfig {
  /** Blocks available in this editor instance (already per-field filtered). */
  blocks?: Record<string, BlockDefinition>;
  getAsset?: GetAssetFn;
  /**
   * Renders the inline prop-editing form. Injected by the widget layer so
   * `ui/editor` never imports widgets/core (layering).
   */
  renderBlockForm?: (props: BlockFormRenderProps) => ReactNode;
  /** Chrome override; `ui/editor` supplies the default. */
  renderBlockChrome?: (props: BlockChromeProps) => ReactNode;
}
