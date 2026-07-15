import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BLOCK_NODE_TYPE } from '@/lib/richtext/blocks/BlockNode';
import { Editor } from '@/lib/widgets/editor/Editor';

import type { SerializedEditorState } from 'lexical';

/**
 * Regression test for DCMS-588 / GH #749.
 *
 * The Portable Text to Lexical bridge (`portableTextToLexical`) emits a
 * generic `decap-block` node (see `customBlockNode` in
 * `bridge/portableTextToLexical.ts`) for any Markdown content it can't map to
 * a plain text/code node, e.g. an image or a `{{< shortcode >}}`, both of
 * which appear in the `dev-test` Kitchen Sink fixture's `markdown` fields.
 *
 * `Editor`'s Lexical node set previously omitted `BlockNode` (the class that
 * declares `getType() === 'decap-block'`), so `editor.parseEditorState`
 * threw ("node type not registered") the instant a field containing one of
 * these blocks mounted, Lexical's minified error #17. Because that throw
 * happened synchronously inside `$initialEditorState`, it propagated up
 * through React's render and into the app's top-level error boundary,
 * crashing the whole CMS UI.
 */
describe('Editor, decap-block initial state (DCMS-588)', () => {
  it('mounts without throwing when the initial state contains a decap-block node', () => {
    const editorSerializedState: SerializedEditorState = {
      root: {
        type: 'root',
        version: 1,
        format: '',
        indent: 0,
        direction: null,
        children: [
          {
            type: BLOCK_NODE_TYPE,
            version: 1,
            componentId: 'youtube',
            data: { url: 'https://www.youtube.com/watch?v=lZ6NEHDgk58' },
          },
        ],
      },
    } as unknown as SerializedEditorState;

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Editor editorSerializedState={editorSerializedState} />)).not.toThrow();

    errorSpy.mockRestore();
  });
});
