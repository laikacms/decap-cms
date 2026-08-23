/**
 * Ambient types for the legacy unified/remark/rehype stack this widget pins.
 *
 * The richtext pipeline is built on unified 9 + remark-parse 6 / remark-stringify 6,
 * whose extension surface is the mutable `this.Parser.prototype.inlineTokenizers` /
 * `this.Compiler.prototype.visitors` API. Most of those packages predate
 * TypeScript and ship no declarations, and the ones that do ship declarations
 * (unified 9) do not model the tokenizer API at all, so consuming them would
 * mean casting at every extension point.
 *
 * Declaring the contract we actually depend on keeps the pipeline cast-free.
 * These declarations are deliberately narrow: they describe the surface used by
 * `src/widgets/richtext/serializers`, not the full package APIs.
 */

declare module 'unified' {
  /** Any unist-shaped node. `MdastNode` and the Slate node shapes both satisfy it. */
  export interface UnistNode {
    type: string;
    value?: string | undefined;
    children?: UnistNode[] | undefined;
    data?: Record<string, unknown> | undefined;
    position?: unknown | undefined;
  }

  export interface VFile {
    contents: string;
    fail: (reason: string) => void;
    toString: () => string;
  }

  /** `eat(subvalue)(node)` adds a node and consumes the matched source. */
  export interface Eat {
    (subvalue: string): (node: UnistNode) => UnistNode;
    file: VFile;
  }

  /** Locates the next possible match so the text tokenizer knows where to stop. */
  export interface Locator {
    (value: string, fromIndex: number): number;
  }

  export interface InlineTokenizer {
    (this: ParserInstance, eat: Eat, value: string, silent?: boolean): unknown;
    locator?: Locator | undefined;
  }

  export interface BlockTokenizer {
    (this: ParserInstance, eat: Eat, value: string, silent?: boolean): unknown;
  }

  export interface ParserInstance {
    inlineMethods: string[];
    inlineTokenizers: Record<string, InlineTokenizer>;
    blockMethods: string[];
    blockTokenizers: Record<string, BlockTokenizer>;
  }

  export interface ParserConstructor {
    prototype: ParserInstance;
  }

  export interface CompilerInstance {
    visitors: Record<string, (node: UnistNode) => string>;
  }

  export interface CompilerConstructor {
    prototype: CompilerInstance;
  }

  /**
   * A plugin. Attachers receive their options at attach time and may return a
   * transformer; the return value is intentionally untyped here because each
   * plugin declares its own transformer signature over the AST it handles.
   */
  export type Attacher = (this: Processor, ...options: never[]) => unknown;

  export interface Preset {
    settings: Record<string, unknown>;
  }

  export type Pluggable = Attacher | Preset;

  export type PluggableList = Array<Pluggable | PluggableList>;

  export interface Processor {
    /** Present once a parser plugin (remark-parse) has been attached. */
    Parser?: ParserConstructor;
    /** Present once a compiler plugin (remark-stringify) has been attached. */
    Compiler?: CompilerConstructor;
    use(plugin: Pluggable | PluggableList, options?: unknown): Processor;
    /**
     * The parsed shape depends on the attached parser, which the type system
     * cannot follow, so callers name it. Defaults to the generic unist shape.
     */
    parse<Out extends UnistNode = UnistNode>(doc: string): Out;
    /**
     * Runs the attached transformers. The output shape is determined by the
     * plugin chain, which the type system cannot follow, so callers name it.
     */
    runSync<Out = UnistNode>(node: UnistNode): Out;
    stringify(node: UnistNode): string;
    processSync(doc: string): VFile;
  }

  const unified: () => Processor;
  export default unified;
}

declare module 'unist-builder' {
  import type { UnistNode } from 'unified';

  /**
   * `u` builds whatever node shape you describe, so the result type is named by
   * the caller (or falls back to the generic unist shape).
   */
  interface Builder {
    <T extends UnistNode = UnistNode>(type: string): T;
    <T extends UnistNode = UnistNode>(type: string, value: string): T;
    <T extends UnistNode = UnistNode>(type: string, children: T[]): T;
    <T extends UnistNode = UnistNode>(type: string, props: Record<string, unknown>): T;
    <T extends UnistNode = UnistNode>(
      type: string,
      props: Record<string, unknown>,
      value: string,
    ): T;
    <T extends UnistNode = UnistNode>(
      type: string,
      props: Record<string, unknown>,
      children: T[],
    ): T;
  }

  const u: Builder;
  export default u;
}

declare module 'unist-util-visit-parents' {
  import type { UnistNode } from 'unified';

  const visitParents: <T extends UnistNode>(
    tree: T,
    visitor: (node: T, parents: T[]) => boolean | void,
  ) => void;
  export default visitParents;
}

declare module 'unist-util-visit' {
  import type { UnistNode } from 'unified';

  const visit: <T extends UnistNode>(
    tree: T,
    test: string | ((node: T) => boolean),
    visitor: (node: T) => boolean | void,
  ) => void;
  export default visit;
}

declare module 'mdast-util-to-string' {
  import type { UnistNode } from 'unified';

  const toString: (node: UnistNode) => string;
  export default toString;
}

declare module 'mdast-util-definitions' {
  import type { UnistNode } from 'unified';

  const definitions: (
    tree: UnistNode,
  ) => (identifier: string) => { url?: string, title?: string | null } | null;
  export default definitions;
}

declare module 'remark-parse' {
  import type { Attacher } from 'unified';

  const markdownToRemarkPlugin: Attacher;
  export default markdownToRemarkPlugin;
}

declare module 'remark-stringify' {
  import type { Attacher } from 'unified';

  const remarkToMarkdownPlugin: Attacher;
  export default remarkToMarkdownPlugin;
}

declare module 'remark-rehype' {
  import type { Attacher } from 'unified';

  const remarkToRehype: Attacher;
  export default remarkToRehype;
}

declare module 'rehype-stringify' {
  import type { Attacher } from 'unified';

  const rehypeToHtml: Attacher;
  export default rehypeToHtml;
}

declare module 'rehype-parse' {
  import type { Attacher } from 'unified';

  const htmlToRehype: Attacher;
  export default htmlToRehype;
}

declare module 'rehype-remark' {
  import type { Attacher } from 'unified';

  const rehypeToRemark: Attacher;
  export default rehypeToRemark;
}

declare module 'rehype-remove-comments' {
  import type { Attacher } from 'unified';

  const rehypeRemoveComments: Attacher;
  export default rehypeRemoveComments;
}
