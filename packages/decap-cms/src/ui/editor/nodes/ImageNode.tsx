import { $applyNodeReplacement, DecoratorNode } from 'lexical';
import * as React from 'react';

import { sanitizeImageSrc } from '@/ui/editor/utils/url';

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import type { JSX } from 'react';

const ImageComponent = React.lazy(() => import('@/ui/editor/editor-ui/ImageComponent'));

export interface ImagePayload {
  altText: string;
  height?: number;
  key?: NodeKey;
  maxWidth?: number;
  requiresConsent?: boolean;
  src: string;
  width?: number;
}

function isGoogleDocCheckboxImg(img: HTMLImageElement): boolean {
  return (
    img.parentElement != null
    && img.parentElement.tagName === 'LI'
    && img.previousSibling === null
    && img.getAttribute('aria-roledescription') === 'checkbox'
  );
}

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement;
  const rawSrc = img.getAttribute('src');
  if (!rawSrc || isGoogleDocCheckboxImg(img)) {
    return null;
  }
  // Sanitize BEFORE creating the node: `domNode` is part of a detached
  // document produced by Lexical's clipboard DOMParser pass, so no
  // subresource fetch has happened yet. Rejecting unsafe `src` values here
  // (rather than after the ImageNode/ImageComponent render pipeline gets
  // hold of them) guarantees a hostile pasted `src` never reaches a live,
  // attached `<img>` — and therefore never gets fetched — at all.
  const src = sanitizeImageSrc(rawSrc);
  if (!src) {
    return null;
  }
  const { alt: altText, width, height } = img;
  // `data:` sources are self-contained (no network round-trip); http(s) and
  // relative sources still require a live fetch to load/probe, so gate them
  // behind explicit user consent rather than letting ImageComponent fetch
  // them the instant the paste lands (DCMS-640).
  const requiresConsent = !/^data:/i.test(src);
  const node = $createImageNode({ altText, height, requiresConsent, src, width });
  return { node };
}

export type SerializedImageNode = Spread<
  {
    altText: string,
    height?: number,
    maxWidth: number,
    // Never produced by `exportJSON` (see the test asserting reloading a
    // saved *editor* doc never re-gates) — but the Portable Text bridge
    // builds this JSON shape directly from persisted PT data and needs a
    // way to hand `importJSON` a freshly-computed consent decision
    // (DCMS-1183). `undefined` preserves the existing "no re-gate" default.
    requiresConsent?: boolean,
    src: string,
    width?: number,
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __maxWidth: number;
  __requiresConsent: boolean;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__key,
      node.__requiresConsent,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, requiresConsent, src } = serializedNode;
    return $createImageNode({
      altText,
      height,
      maxWidth,
      requiresConsent,
      src,
      width,
    }).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedImageNode>): this {
    const node = super.updateFromJSON(serializedNode);

    return node;
  }

  exportDOM(): DOMExportOutput {
    const imgElement = document.createElement('img');
    imgElement.setAttribute('src', this.__src);
    imgElement.setAttribute('alt', this.__altText);
    imgElement.setAttribute('width', this.__width.toString());
    imgElement.setAttribute('height', this.__height.toString());

    return { element: imgElement };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    key?: NodeKey,
    requiresConsent?: boolean,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    this.__requiresConsent = requiresConsent ?? false;
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      altText: this.getAltText(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      src: this.getSrc(),
      width: this.__width === 'inherit' ? 0 : this.__width,
    };
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): this {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
    return writable;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.getLatest().__src;
  }

  getAltText(): string {
    return this.getLatest().__altText;
  }

  getRequiresConsent(): boolean {
    return this.getLatest().__requiresConsent;
  }

  clearRequiresConsent(): this {
    const writable = this.getWritable();
    writable.__requiresConsent = false;
    return writable;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
        requiresConsent={this.__requiresConsent}
      />
    );
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 500,
  requiresConsent,
  src,
  width,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(src, altText, maxWidth, width, height, key, requiresConsent),
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
