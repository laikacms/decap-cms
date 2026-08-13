import { DecoratorNode } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor, getHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { DEFAULT_NODES } from '@/lib/richtext/lexical/nodes';

/**
 * DCMS-2094: `createHeadlessEditor`/`getHeadlessEditor` build the shared
 * no-DOM Lexical editor used for serialization outside the UI. Prior to this
 * file, no test referenced either export (`git grep -l 'getHeadlessEditor'
 * -- '*.spec.*'` returned zero hits).
 */

class TestDecoratorNode extends DecoratorNode<null> {
  static getType(): string {
    return 'test-decorator';
  }

  static clone(node: TestDecoratorNode): TestDecoratorNode {
    return new TestDecoratorNode(node.__key);
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): null {
    return null;
  }
}

describe('createHeadlessEditor', () => {
  it('registers every node in DEFAULT_NODES', () => {
    const editor = createHeadlessEditor();
    const registeredTypes = new Set(editor._nodes.keys());

    for (const nodeClass of DEFAULT_NODES) {
      expect(registeredTypes.has(nodeClass.getType())).toBe(true);
    }
  });

  it('additionally registers extraNodes passed to it', () => {
    const editor = createHeadlessEditor([TestDecoratorNode]);

    expect(editor._nodes.has(TestDecoratorNode.getType())).toBe(true);
    // extraNodes are additive, not a replacement of the defaults
    for (const nodeClass of DEFAULT_NODES) {
      expect(editor._nodes.has(nodeClass.getType())).toBe(true);
    }
  });

  it('does not register nodes outside of DEFAULT_NODES/extraNodes', () => {
    const editor = createHeadlessEditor();

    expect(editor._nodes.has(TestDecoratorNode.getType())).toBe(false);
  });

  it('returns a fresh editor instance on every call', () => {
    const first = createHeadlessEditor();
    const second = createHeadlessEditor();

    expect(first).not.toBe(second);
  });

  it('rethrows errors reported via onError instead of swallowing them', () => {
    const editor = createHeadlessEditor();
    const boom = new Error('boom');

    expect(() => {
      editor.update(
        () => {
          throw boom;
        },
        { discrete: true },
      );
    }).toThrow(boom);
  });

  it('supports an empty extraNodes array (default parameter) without throwing', () => {
    expect(() => createHeadlessEditor([])).not.toThrow();
  });
});

describe('getHeadlessEditor', () => {
  it('returns the same editor instance across multiple calls', () => {
    const first = getHeadlessEditor();
    const second = getHeadlessEditor();

    expect(second).toBe(first);
  });

  it('returns an editor registered with the default nodes', () => {
    const editor = getHeadlessEditor();
    const registeredTypes = new Set(editor._nodes.keys());

    for (const nodeClass of DEFAULT_NODES) {
      expect(registeredTypes.has(nodeClass.getType())).toBe(true);
    }
  });

  it('the shared singleton is distinct from editors created directly via createHeadlessEditor', () => {
    const shared = getHeadlessEditor();
    const standalone = createHeadlessEditor();

    expect(shared).not.toBe(standalone);
  });
});
