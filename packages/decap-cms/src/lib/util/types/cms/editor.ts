/**
 * The editor, reachable from outside React as `CMS.editor`, and the field
 * actions extensions add beside each top-level field's label
 * (`CMS.registerFieldAction`).
 *
 * Experimental: built for the Decap Turbo editor bridge, and may change or go
 * away in any release, minor and patch included.
 */

/** A field definition as the config spells it, reduced to plain values. */
export interface CmsEditorFieldDefinition {
  name: string;
  label?: string;
  widget?: string;
  [key: string]: unknown;
}

/** The open entry as plain values. */
export interface CmsEditorSnapshot {
  collection: string;
  collectionLabel: string;
  /** The entry's slug, or the file's name in a file collection; null for a new entry. */
  slug: string | null;
  newRecord: boolean;
  path: string | null;
  /** The collection's field definitions, as in the config. */
  fields: CmsEditorFieldDefinition[];
  /** The current, possibly unsaved, values of the default locale. */
  data: Record<string, unknown>;
  /** Other locales' values, keyed by locale, when the collection has i18n. */
  i18n: Record<string, { data: Record<string, unknown> }> | null;
  locales: string[] | null;
  defaultLocale: string | null;
  hasChanged: boolean;
}

/** One change: `path` is a field name, or a dotted path into an object or list (`seo.description`, `tags.0`). */
export interface CmsFieldPatch {
  path: string;
  value: unknown;
}

export interface CmsFieldPatchResult {
  applied: string[];
  rejected: { path: string, reason: string }[];
}

export interface CmsEditorApi {
  getCurrentEntry(): CmsEditorSnapshot | null;
  applyFieldPatch(patches: CmsFieldPatch[], options?: { locale?: string | undefined }): CmsFieldPatchResult;
  onEditorChange(listener: (snapshot: CmsEditorSnapshot | null) => void): () => void;
}

/** What a field action is called with: plain values, never the editor's internals. */
export interface CmsFieldActionContext {
  field: CmsEditorFieldDefinition;
  collection: string;
  locale: string | undefined;
  /** The open entry as it is when read. */
  readonly entry: CmsEditorSnapshot | null;
  applyFieldPatch: CmsEditorApi['applyFieldPatch'];
}

export interface CmsFieldAction {
  /** Unique; registering the same id again replaces the earlier action. */
  id: string;
  label: string;
  title?: string;
  isAvailable?: (context: CmsFieldActionContext) => boolean;
  onClick: (context: CmsFieldActionContext) => void;
}
