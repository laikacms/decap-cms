// Common types and interfaces for text format conversion packages

export interface SlateText {
  text: string;
  type?: never;
  children?: never;
  data?: Record<string, unknown>; // restored optional metadata container
  [key: string]: any; // For marks like bold, italic, etc.
}

export interface SlateElement {
  type: string;
  children: SlateNode[];
  data?: Record<string, unknown>; // restored optional metadata container
  [key: string]: any;
}

export type SlateNode = SlateText | SlateElement;

/**
 * Format converter interface - all format packages should implement this
 */
export interface FormatConverter<T = any> {
  /**
   * Convert from Slate format to target format
   */
  fromSlate(slateNodes: SlateNode[]): T;

  /**
   * Convert from target format to Slate format
   */
  toSlate(content: T): SlateNode[];

  /**
   * Detect if content is in this format
   */
  detect?(content: any): boolean;

  /**
   * Format name identifier
   */
  readonly formatName: string;
}

/**
 * Supported text formats
 */
export type TextFormat = 'slate' | 'rtf' | 'markdown' | 'html' | 'plain-text';

/**
 * Format detection result
 */
export interface FormatDetectionResult {
  format: TextFormat;
  confidence: number; // 0-1 scale
}

/**
 * Universal format converter options
 */
export interface ConversionOptions {
  /**
   * Source format (auto-detect if not specified)
   */
  from?: TextFormat;

  /**
   * Target format
   */
  to: TextFormat;

  /**
   * Additional options for specific converters
   */
  options?: Record<string, any>;
}

/**
 * Slate node types constants
 */
export const SLATE_NODE_TYPES = {
  PARAGRAPH: 'p',
  HEADING_1: 'h1',
  HEADING_2: 'h2',
  HEADING_3: 'h3',
  HEADING_4: 'h4',
  HEADING_5: 'h5',
  HEADING_6: 'h6',
  UNORDERED_LIST: 'ul',
  ORDERED_LIST: 'ol',
  LIST_ITEM: 'li',
  BLOCKQUOTE: 'blockquote',
  HR: 'hr',
  LINK: 'a',
  IMAGE: 'image',
  TABLE: 'table',
  TABLE_ROW: 'tr',
  TABLE_CELL: 'td',
  TABLE_HEADER_CELL: 'th',
  CODE_BLOCK: 'code_block',
  EMBEDDED_ENTRY: 'embedded-entry',
  EMBEDDED_ASSET: 'embedded-asset',
  COMPONENT: 'component',
} as const;

/**
 * Utility function to create a default empty Slate paragraph
 */
export function createEmptyParagraph(): SlateNode {
  return {
    type: SLATE_NODE_TYPES.PARAGRAPH,
    children: [{ text: '' }],
  };
}

/**
 * Utility function to extract plain text from Slate nodes
 */
export function extractPlainText(nodes: SlateNode[]): string {
  return nodes
    .map(node => {
      if (node.text !== undefined) {
        return node.text;
      }
      if (node.children) {
        return extractPlainText(node.children);
      }
      return '';
    })
    .join('');
}

/**
 * Utility function to generate a unique component ID
 */
export function generateComponentId(): string {
  return `component_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
