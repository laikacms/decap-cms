import type { List } from "immutable";

type JSXElement = unknown;

export type EditorComponentField =
  | {
    name: string;
    label: string;
    widget?: string;
    [key: string]: unknown;
  }
  | {
    widget: 'list';
    /**
     * Used if widget === "list" to create a flat array
     */
    field?: EditorComponentField;
    /**
     * Used if widget === "list" to create an array of objects
     */
    fields?: EditorComponentField[];
  };

export interface EditorComponentOptions {
  id: string;
  label: string;
  fields?: EditorComponentField[];
  pattern: RegExp;
  allow_add?: boolean;
  fromBlock: (match: RegExpMatchArray) => any;
  toBlock: (data: any) => string;
  toPreview: (data: any, getAsset: (value: string, field?: any) => string, fields?: any[]) => string | JSXElement;
}

export interface EditorComponentPlugin extends Omit<EditorComponentOptions, 'fields'> {
  type?: 'code-block' | 'shortcode';
  icon?: string;
  widget?: string;
  fields: List<EditorComponentField>;
}