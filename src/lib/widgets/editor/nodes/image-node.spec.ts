import { $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { $isImageNode, ImageNode } from '@/lib/widgets/editor/nodes/image-node';

/**
 * Regression coverage for DCMS-639 / GH #841: pasting HTML containing an
 * `<img>` must never create an ImageNode (and therefore never render a
 * live, fetching `<img>`) from an unsafe `src`. This exercises the exact
 * conversion Lexical's clipboard paste handling calls
 * (`ImageNode.importDOM().img().conversion`) against a detached DOM node,
 * mirroring how `$generateNodesFromDOM` processes pasted clipboard HTML.
 */
function convertImg(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  if (!img) {
    throw new Error('test fixture HTML must contain an <img>');
  }
  const conversion = ImageNode.importDOM!()!.img!(img)!.conversion;
  return conversion(img);
}

describe('ImageNode.importDOM ($convertImageElement)', () => {
  it('rejects a javascript: src (DCMS-639 repro shape)', () => {
    const result = convertImg('<img src="javascript:alert(3)" onerror="alert(3)">');
    expect(result).toBeNull();
  });

  it('rejects a vbscript: src', () => {
    const result = convertImg('<img src="vbscript:msgbox(1)">');
    expect(result).toBeNull();
  });

  it('rejects a file: src', () => {
    const result = convertImg('<img src="file:///etc/passwd">');
    expect(result).toBeNull();
  });

  it('accepts a safe https src and preserves it verbatim', () => {
    const editor = createHeadlessEditor([ImageNode]);

    let src: string | null = null;
    editor.update(
      () => {
        const result = convertImg('<img src="https://example.com/cat.png" alt="a cat">');
        expect(result).not.toBeNull();
        const node = result!.node;
        expect($isImageNode(node)).toBe(true);
        if ($isImageNode(node)) {
          $getRoot().append(node);
          src = node.getSrc();
        }
      },
      { discrete: true },
    );

    expect(src).toBe('https://example.com/cat.png');
  });
});
