import {
  type SlateNode,
  type FormatConverter,
  SLATE_NODE_TYPES,
  createEmptyParagraph,
} from './common';

/**
 * HTML Format Converter
 * Converts between Slate.js nodes and HTML format
 */
export class HTMLConverter implements FormatConverter<string> {
  readonly formatName = 'html';
  /**
   * Convert Slate nodes to HTML string
   */
  fromSlate(nodes: SlateNode[]): string {
    if (!nodes || nodes.length === 0) {
      return '';
    }

    return nodes.map(node => this.nodeToHTML(node)).join('');
  }

  /**
   * Convert HTML string to Slate nodes
   */
  toSlate(html: string): SlateNode[] {
    if (!html || html.trim() === '') {
      return [createEmptyParagraph()];
    }

    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Convert body children to Slate nodes
    const nodes: SlateNode[] = [];
    const childNodes = doc.body.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      const slateNode = this.domNodeToSlate(child);
      if (slateNode) {
        nodes.push(slateNode);
      }
    }

    return nodes.length > 0 ? nodes : [createEmptyParagraph()];
  }

  /**
   * Detect if content is HTML format
   */
  detect(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    // Simple HTML detection - look for HTML tags
    const htmlTagRegex = /<\/?[a-z][\s\S]*>/i;
    return htmlTagRegex.test(content.trim());
  }

  /**
   * Convert a Slate node to HTML string
   */
  private nodeToHTML(node: SlateNode): string {
    // Handle text nodes
    if ('text' in node) {
      let text = this.escapeHTML(node.text || '');

      // Apply text formatting
      if (node.bold) text = `<strong>${text}</strong>`;
      if (node.italic) text = `<em>${text}</em>`;
      if (node.underline) text = `<u>${text}</u>`;
      if (node.strikethrough) text = `<s>${text}</s>`;
      if (node.code) text = `<code>${text}</code>`;

      return text;
    }

    // Handle element nodes
    const children = node.children?.map(child => this.nodeToHTML(child)).join('') || '';

    switch (node.type) {
      case SLATE_NODE_TYPES.PARAGRAPH:
        return `<p>${children}</p>`;

      case SLATE_NODE_TYPES.HEADING_1:
        return `<h1>${children}</h1>`;

      case SLATE_NODE_TYPES.HEADING_2:
        return `<h2>${children}</h2>`;

      case SLATE_NODE_TYPES.HEADING_3:
        return `<h3>${children}</h3>`;

      case SLATE_NODE_TYPES.HEADING_4:
        return `<h4>${children}</h4>`;

      case SLATE_NODE_TYPES.HEADING_5:
        return `<h5>${children}</h5>`;

      case SLATE_NODE_TYPES.HEADING_6:
        return `<h6>${children}</h6>`;

      case SLATE_NODE_TYPES.BLOCKQUOTE:
        return `<blockquote>${children}</blockquote>`;

      case SLATE_NODE_TYPES.UNORDERED_LIST:
        return `<ul>${children}</ul>`;

      case SLATE_NODE_TYPES.ORDERED_LIST:
        return `<ol>${children}</ol>`;

      case SLATE_NODE_TYPES.LIST_ITEM:
        return `<li>${children}</li>`;

      case SLATE_NODE_TYPES.LINK: {
        const href = node.url || '#';
        const title = node.title ? ` title="${this.escapeHTML(node.title)}"` : '';
        return `<a href="${this.escapeHTML(href)}"${title}>${children}</a>`;
      }

      case SLATE_NODE_TYPES.IMAGE: {
        const src = node.url || node.data?.url || '';
        const alt = node.alt || node.data?.alt || '';
        const imgTitle = node.title || node.data?.title || '';
        const titleAttr = imgTitle ? ` title="${this.escapeHTML(imgTitle)}"` : '';
        return `<img src="${this.escapeHTML(src)}" alt="${this.escapeHTML(alt)}"${titleAttr} />`;
      }

      case SLATE_NODE_TYPES.CODE_BLOCK: {
        const language = node.language || node.data?.language || '';
        const langClass = language ? ` class="language-${language}"` : '';
        return `<pre><code${langClass}>${children}</code></pre>`;
      }

      case 'hr':
        return '<hr />';

      // Handle shortcodes and components as HTML comments with data
      case 'shortcode':
      case 'embedded-entry':
      case 'embedded-asset':
        return this.componentToHTML(node);

      default:
        // Fallback to div for unknown types
        return `<div data-slate-type="${node.type}">${children}</div>`;
    }
  }

  /**
   * Convert DOM node to Slate node
   */
  private domNodeToSlate(domNode: Node): SlateNode | null {
    // Handle text nodes
    if (domNode.nodeType === Node.TEXT_NODE) {
      const text = domNode.textContent || '';
      return text ? { text } : null;
    }

    // Handle element nodes
    if (domNode.nodeType === Node.ELEMENT_NODE) {
      const element = domNode as Element;
      const tagName = element.tagName.toLowerCase();

      // Convert children
      const children: SlateNode[] = [];
      const childNodes = element.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i];
        const slateChild = this.domNodeToSlate(child);
        if (slateChild) {
          children.push(slateChild);
        }
      }

      // Ensure we have at least one child for block elements
      if (children.length === 0 && this.isBlockElement(tagName)) {
        children.push({ text: '' });
      }

      switch (tagName) {
        case 'p':
          return { type: SLATE_NODE_TYPES.PARAGRAPH, children };

        case 'h1':
          return { type: SLATE_NODE_TYPES.HEADING_1, children };

        case 'h2':
          return { type: SLATE_NODE_TYPES.HEADING_2, children };

        case 'h3':
          return { type: SLATE_NODE_TYPES.HEADING_3, children };

        case 'h4':
          return { type: SLATE_NODE_TYPES.HEADING_4, children };

        case 'h5':
          return { type: SLATE_NODE_TYPES.HEADING_5, children };

        case 'h6':
          return { type: SLATE_NODE_TYPES.HEADING_6, children };

        case 'blockquote':
          return { type: SLATE_NODE_TYPES.BLOCKQUOTE, children };

        case 'ul':
          return { type: SLATE_NODE_TYPES.UNORDERED_LIST, children };

        case 'ol':
          return { type: SLATE_NODE_TYPES.ORDERED_LIST, children };

        case 'li':
          return { type: SLATE_NODE_TYPES.LIST_ITEM, children };

        case 'a': {
          const href = element.getAttribute('href') || '';
          const title = element.getAttribute('title') || '';
          return {
            type: SLATE_NODE_TYPES.LINK,
            url: href,
            title: title || undefined,
            children,
          };
        }

        case 'img': {
          const src = element.getAttribute('src') || '';
          const alt = element.getAttribute('alt') || '';
          const imgTitle = element.getAttribute('title') || '';
          return {
            type: SLATE_NODE_TYPES.IMAGE,
            url: src,
            alt,
            title: imgTitle || undefined,
            children: [{ text: '' }],
          };
        }

        case 'pre': {
          // Look for code element inside pre
          const codeElement = element.querySelector('code');
          if (codeElement) {
            const className = codeElement.getAttribute('class') || '';
            const language = className.match(/language-(\w+)/)?.[1] || '';
            const codeChildNodes = codeElement.childNodes;
            const codeChildren: SlateNode[] = [];
            for (let i = 0; i < codeChildNodes.length; i++) {
              const child = this.domNodeToSlate(codeChildNodes[i]);
              if (child) {
                codeChildren.push(child);
              }
            }

            return {
              type: SLATE_NODE_TYPES.CODE_BLOCK,
              language: language || undefined,
              children: codeChildren.length > 0 ? codeChildren : [{ text: '' }],
            };
          }
          return { type: SLATE_NODE_TYPES.CODE_BLOCK, children };
        }

        case 'code':
          // Inline code - apply formatting to children
          return this.applyInlineFormatting(children, { code: true });

        case 'strong':
        case 'b':
          return this.applyInlineFormatting(children, { bold: true });

        case 'em':
        case 'i':
          return this.applyInlineFormatting(children, { italic: true });

        case 'u':
          return this.applyInlineFormatting(children, { underline: true });

        case 's':
        case 'strike':
        case 'del':
          return this.applyInlineFormatting(children, { strikethrough: true });

        case 'hr':
          return { type: 'hr', children: [{ text: '' }] };

        case 'br':
          return { text: '\n' };

        default: {
          // Check for component data
          const slateType = element.getAttribute('data-slate-type');
          if (slateType) {
            return { type: slateType, children };
          }

          // For other elements, return children directly or wrap in paragraph
          if (children.length === 1 && 'text' in children[0]) {
            return children[0];
          }
          return children.length > 0 ? { type: SLATE_NODE_TYPES.PARAGRAPH, children } : null;
        }
      }
    }

    return null;
  }

  /**
   * Apply inline formatting to children
   */
  private applyInlineFormatting(
    children: SlateNode[],
    formatting: Record<string, boolean>,
  ): SlateNode | null {
    if (children.length === 1 && 'text' in children[0]) {
      return { ...children[0], ...formatting };
    }

    // For multiple children, we need to return them as separate nodes
    // This is a limitation of this simple approach
    return children.length > 0 ? children[0] : null;
  }

  /**
   * Check if element is a block element
   */
  private isBlockElement(tagName: string): boolean {
    const blockElements = [
      'p',
      'div',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'ul',
      'ol',
      'li',
      'pre',
      'hr',
    ];
    return blockElements.indexOf(tagName) !== -1;
  }

  /**
   * Convert component/shortcode to HTML comment
   */
  private componentToHTML(node: SlateNode): string {
    const data = {
      type: node.type,
      id: node.id,
      data: node.data,
    };

    const jsonData = JSON.stringify(data);
    const encodedData = encodeURIComponent(jsonData);

    return `<!-- slate-component:${encodedData} -->`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export default instance
export const htmlConverter = new HTMLConverter();
