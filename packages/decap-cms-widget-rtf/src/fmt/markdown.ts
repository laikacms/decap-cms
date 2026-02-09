// Import the existing, battle-tested serializers from the markdown widget
import { markdownToSlate, slateToMarkdown } from 'decap-cms-widget-markdown/src/serializers';

import {
  type SlateNode,
  type FormatConverter,
  createEmptyParagraph,
  extractPlainText,
} from './common';

/**
 * Markdown format converter that leverages the existing decap-cms-widget-markdown serializers.
 * This ensures full compatibility with shortcodes, editor components, and remark plugins.
 */
export class MarkdownConverter implements FormatConverter<string> {
  readonly formatName = 'markdown';
  /**
   * Convert Slate nodes to Markdown string
   */
  fromSlate(nodes: SlateNode[]): string {
    if (!nodes || nodes.length === 0) {
      return '';
    }

    try {
      // Use the existing slateToMarkdown serializer which handles:
      // - All markdown syntax (headings, lists, links, etc.)
      // - Shortcodes and editor components
      // - Custom remark plugins
      const markdown = slateToMarkdown(
        nodes,
        {
          voidCodeBlock: false, // Use standard code blocks
          remarkPlugins: [], // Can be extended with custom plugins
        } as Parameters<
          typeof slateToMarkdown
        >[1] /* For some reason doesn't allow voidCodeBlock */,
      );

      return markdown || '';
    } catch (error) {
      console.warn('Failed to convert Slate to Markdown:', error);
      // Fallback to plain text extraction
      return extractPlainText(nodes);
    }
  }

  /**
   * Convert Markdown string to Slate nodes
   */
  toSlate(markdown: string): SlateNode[] {
    if (!markdown || typeof markdown !== 'string') {
      return [createEmptyParagraph()];
    }

    try {
      // Use the existing markdownToSlate serializer which handles:
      // - All markdown syntax parsing
      // - Shortcode parsing with editor components
      // - Custom remark plugins
      const slateNodes = markdownToSlate(
        markdown,
        {
          voidCodeBlock: false, // Use standard code blocks
          remarkPlugins: [], // Can be extended with custom plugins
        } as Parameters<
          typeof markdownToSlate
        >[1] /* For some reason doesn't allow voidCodeBlock */,
      );

      // Ensure we always return a valid array of nodes
      if (!slateNodes || !Array.isArray(slateNodes) || slateNodes.length === 0) {
        return [createEmptyParagraph()];
      }

      return slateNodes;
    } catch (error) {
      console.warn('Failed to convert Markdown to Slate:', error);
      // Fallback: create a paragraph with the raw text
      return [
        {
          type: 'paragraph',
          children: [{ text: markdown }],
        },
      ];
    }
  }

  /**
   * Detect if content is likely Markdown format
   */
  detect(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    // Common Markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s+.+$/m, // Headers
      /^\*\s+.+$/m, // Unordered lists
      /^\d+\.\s+.+$/m, // Ordered lists
      /\*\*[^*]+\*\*/, // Bold text
      /\*[^*]+\*/, // Italic text
      /`[^`]+`/, // Inline code
      /```[\s\S]*?```/, // Code blocks
      /\[.+\]\(.+\)/, // Links
      /!\[.*\]\(.+\)/, // Images
      /^>\s+.+$/m, // Blockquotes
      /^\|.+\|$/m, // Tables
      /^---+$/m, // Horizontal rules
    ];

    // Check if content contains multiple markdown patterns
    const matchCount = markdownPatterns.reduce((count, pattern) => {
      return count + (pattern.test(content) ? 1 : 0);
    }, 0);

    // Consider it markdown if it has 2 or more patterns, or specific strong indicators
    return (
      matchCount >= 2 ||
      /^#{1,6}\s+.+$/m.test(content) || // Headers are strong indicators
      /```[\s\S]*?```/.test(content) || // Code blocks are strong indicators
      /^\|.+\|$/m.test(content)
    ); // Tables are strong indicators
  }
}

/**
 * Advanced Markdown converter with configurable options for remark plugins and editor components
 */
export class AdvancedMarkdownConverter implements FormatConverter<string> {
  readonly formatName = 'markdown';
  private remarkPlugins: any[];
  private voidCodeBlock: boolean;

  constructor(
    options: {
      remarkPlugins?: any[];
      voidCodeBlock?: boolean;
    } = {},
  ) {
    this.remarkPlugins = options.remarkPlugins || [];
    this.voidCodeBlock = options.voidCodeBlock || false;
  }

  fromSlate(nodes: SlateNode[]): string {
    if (!nodes || nodes.length === 0) {
      return '';
    }

    try {
      const markdown = slateToMarkdown(
        nodes,
        {
          voidCodeBlock: this.voidCodeBlock,
          remarkPlugins: this.remarkPlugins as any, // Type assertion due to slateToMarkdown's options typing
        } as Parameters<
          typeof slateToMarkdown
        >[1] /* For some reason doesn't allow voidCodeBlock */,
      );

      return markdown || '';
    } catch (error) {
      console.warn('Failed to convert Slate to Markdown:', error);
      return extractPlainText(nodes);
    }
  }

  toSlate(markdown: string): SlateNode[] {
    if (!markdown || typeof markdown !== 'string') {
      return [createEmptyParagraph()];
    }

    try {
      const slateNodes = markdownToSlate(
        markdown,
        {
          voidCodeBlock: this.voidCodeBlock,
          remarkPlugins: this.remarkPlugins as any, // Type assertion due to slateToMarkdown's options typing
        } as Parameters<
          typeof markdownToSlate
        >[1] /* For some reason doesn't allow voidCodeBlock */,
      );

      if (!slateNodes || !Array.isArray(slateNodes) || slateNodes.length === 0) {
        return [createEmptyParagraph()];
      }

      return slateNodes;
    } catch (error) {
      console.warn('Failed to convert Markdown to Slate:', error);
      return [
        {
          type: 'paragraph',
          children: [{ text: markdown }],
        },
      ];
    }
  }

  detect(content: string): boolean {
    // Use the same detection logic as the basic converter
    const basicConverter = new MarkdownConverter();
    return basicConverter.detect(content);
  }

  /**
   * Update remark plugins configuration
   */
  setRemarkPlugins(plugins: any[]): void {
    this.remarkPlugins = plugins;
  }

  /**
   * Update void code block setting
   */
  setVoidCodeBlock(enabled: boolean): void {
    this.voidCodeBlock = enabled;
  }
}

// Export the converter instances
export const markdownConverter = new MarkdownConverter();
export const advancedMarkdownConverter = new AdvancedMarkdownConverter();

// Export types for external use
export type { SlateNode } from './common';
