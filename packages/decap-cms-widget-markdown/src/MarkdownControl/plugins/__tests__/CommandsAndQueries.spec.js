import CommandsAndQueries from '../CommandsAndQueries';

/*
 * CommandsAndQueries.js implements its `queries` as pure functions of an
 * `editor` shaped like a legacy Slate editor: `editor.value.document` exposes
 * `getParent`/`getCommonAncestor`/`getClosest`/`isInRange`, and nodes are
 * plain objects with a `key`, `type`, and a `nodes` collection that (like the
 * Immutable.js List Slate used to use) supports `.first()` in addition to
 * normal array methods.
 *
 * There is no real Slate document graph available for this legacy shape in
 * this package anymore, so these tests build a tiny in-memory document tree
 * mock that implements exactly the methods CommandsAndQueries calls on it.
 */

function makeNode(key, type, children = []) {
  const nodes = children;
  nodes.first = () => nodes[0];
  return { key, type, nodes };
}

function indexTree(node, parentMap, nodeMap, parent) {
  nodeMap.set(node.key, node);
  parentMap.set(node.key, parent || null);
  node.nodes.forEach(child => indexTree(child, parentMap, nodeMap, node));
}

function ancestorChain(key, parentMap, nodeMap) {
  const chain = [];
  let current = nodeMap.get(key);
  while (current) {
    chain.push(current);
    current = parentMap.get(current.key);
  }
  return chain;
}

function buildDocument(root) {
  const parentMap = new Map();
  const nodeMap = new Map();
  indexTree(root, parentMap, nodeMap, null);

  return {
    root,
    getParent: key => parentMap.get(key) || null,
    getCommonAncestor: (keyA, keyB) => {
      const chainA = ancestorChain(keyA, parentMap, nodeMap);
      const chainBKeys = new Set(ancestorChain(keyB, parentMap, nodeMap).map(n => n.key));
      return chainA.find(n => chainBKeys.has(n.key));
    },
    getClosest: (key, predicate) => {
      let current = parentMap.get(nodeMap.get(key).key);
      while (current) {
        if (predicate(current)) return current;
        current = parentMap.get(current.key);
      }
      return undefined;
    },
    isInRange: (key, selection) => selection.has(key),
  };
}

function buildEditor(overrides = {}) {
  return {
    value: {
      document: overrides.document,
      selection: overrides.selection,
      startBlock: overrides.startBlock,
      endBlock: overrides.endBlock,
      blocks: overrides.blocks || [],
      inlines: overrides.inlines || [],
      activeMarks: overrides.activeMarks || [],
    },
    isSelected: overrides.isSelected,
    getCommonAncestor: overrides.getCommonAncestor,
    getBlockContainer: overrides.getBlockContainer,
  };
}

describe('CommandsAndQueries', () => {
  const { queries } = CommandsAndQueries({ defaultType: 'paragraph' });

  describe('atStartOf', () => {
    it('returns true when the selection is collapsed and at the start of the node', () => {
      const node = makeNode('a', 'paragraph');
      const editor = buildEditor({
        selection: { isCollapsed: true, start: { isAtStartOfNode: n => n.key === 'a' } },
      });

      expect(queries.atStartOf(editor, node)).toBe(true);
    });

    it('returns false when the selection is not collapsed', () => {
      const node = makeNode('a', 'paragraph');
      const editor = buildEditor({
        selection: { isCollapsed: false, start: { isAtStartOfNode: () => true } },
      });

      expect(queries.atStartOf(editor, node)).toBe(false);
    });

    it('returns false when collapsed but not at the start of the node', () => {
      const node = makeNode('a', 'paragraph');
      const editor = buildEditor({
        selection: { isCollapsed: true, start: { isAtStartOfNode: () => false } },
      });

      expect(queries.atStartOf(editor, node)).toBe(false);
    });
  });

  describe('getAncestor', () => {
    it('returns the parent when firstKey and lastKey are the same', () => {
      const child = makeNode('child', 'paragraph');
      const root = makeNode('root', 'document', [child]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.getAncestor(editor, 'child', 'child')).toBe(root);
    });

    it('returns the common ancestor when firstKey and lastKey differ', () => {
      const childA = makeNode('a', 'paragraph');
      const childB = makeNode('b', 'paragraph');
      const root = makeNode('root', 'document', [childA, childB]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.getAncestor(editor, 'a', 'b')).toBe(root);
    });
  });

  describe('getOffset', () => {
    it('returns the index of the node within its parent', () => {
      const first = makeNode('first', 'paragraph');
      const second = makeNode('second', 'paragraph');
      const root = makeNode('root', 'document', [first, second]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.getOffset(editor, second)).toBe(1);
      expect(queries.getOffset(editor, first)).toBe(0);
    });
  });

  describe('getSelectedChildren', () => {
    it('returns only the children editor.isSelected reports as selected', () => {
      const childA = makeNode('a', 'paragraph');
      const childB = makeNode('b', 'paragraph');
      const parent = makeNode('parent', 'quote', [childA, childB]);
      const editor = buildEditor({ isSelected: node => node.key === 'a' });

      expect(queries.getSelectedChildren(editor, parent)).toEqual([childA]);
    });

    it('returns an empty array when no children are selected', () => {
      const childA = makeNode('a', 'paragraph');
      const parent = makeNode('parent', 'quote', [childA]);
      const editor = buildEditor({ isSelected: () => false });

      expect(queries.getSelectedChildren(editor, parent)).toEqual([]);
    });
  });

  describe('getCommonAncestor', () => {
    it('returns the common ancestor of the start and end blocks', () => {
      const startBlock = makeNode('start', 'paragraph');
      const endBlock = makeNode('end', 'paragraph');
      const root = makeNode('root', 'document', [startBlock, endBlock]);
      const document = buildDocument(root);
      const editor = buildEditor({ document, startBlock, endBlock });

      expect(queries.getCommonAncestor(editor)).toBe(root);
    });
  });

  describe('getClosestType', () => {
    it('finds the closest ancestor matching a single type', () => {
      const target = makeNode('target', 'quote');
      const child = makeNode('child', 'paragraph');
      target.nodes.push(child);
      const root = makeNode('root', 'document', [target]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.getClosestType(editor, child, 'quote')).toBe(target);
    });

    it('finds the closest ancestor matching any type in an array', () => {
      const target = makeNode('target', 'bulleted-list');
      const child = makeNode('child', 'list-item');
      target.nodes.push(child);
      const root = makeNode('root', 'document', [target]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.getClosestType(editor, child, ['numbered-list', 'bulleted-list'])).toBe(
        target,
      );
    });

    it('returns undefined when no ancestor matches the type', () => {
      const target = makeNode('target', 'quote');
      const child = makeNode('child', 'paragraph');
      target.nodes.push(child);
      const root = makeNode('root', 'document', [target]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.getClosestType(editor, child, 'table-cell')).toBeUndefined();
    });
  });

  describe('getBlockContainer', () => {
    it('returns the parent of the node directly when it is already a container type', () => {
      const quote = makeNode('quote', 'quote');
      const paragraph = makeNode('paragraph', 'paragraph');
      quote.nodes.push(paragraph);
      const root = makeNode('root', 'document', [quote]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.getBlockContainer(editor, paragraph)).toBe(quote);
    });

    it('recurses via editor.getBlockContainer when the parent is not a container type', () => {
      const grandparent = makeNode('grandparent', 'quote');
      const parent = makeNode('parent', 'paragraph');
      const node = makeNode('node', 'text-ish');
      parent.nodes.push(node);
      grandparent.nodes.push(parent);
      const root = makeNode('root', 'document', [grandparent]);
      const document = buildDocument(root);
      const getBlockContainer = jest.fn(target => `recursed:${target.key}`);
      const editor = buildEditor({ document, getBlockContainer });

      expect(queries.getBlockContainer(editor, node)).toBe('recursed:parent');
      expect(getBlockContainer).toHaveBeenCalledWith(parent);
    });

    it('uses the collapsed selection start block when no node is given', () => {
      const startBlock = makeNode('start', 'table-cell');
      const root = makeNode('root', 'document', [startBlock]);
      const document = buildDocument(root);
      const editor = buildEditor({
        document,
        selection: { isCollapsed: true },
        startBlock,
      });

      expect(queries.getBlockContainer(editor)).toBe(startBlock);
    });

    it('uses editor.getCommonAncestor when the selection is not collapsed and no node is given', () => {
      const ancestor = makeNode('ancestor', 'quote');
      const root = makeNode('root', 'document', [ancestor]);
      const document = buildDocument(root);
      const editor = buildEditor({
        document,
        selection: { isCollapsed: false },
        getCommonAncestor: () => ancestor,
      });

      expect(queries.getBlockContainer(editor)).toBe(ancestor);
    });

    it('falls back to the document when there is no target', () => {
      const root = makeNode('root', 'document', []);
      const document = buildDocument(root);
      const editor = buildEditor({
        document,
        selection: { isCollapsed: false },
        getCommonAncestor: () => undefined,
      });

      expect(queries.getBlockContainer(editor)).toBe(document);
    });
  });

  describe('isSelected', () => {
    it('returns true when a single node is in range', () => {
      const node = makeNode('a', 'paragraph');
      const editor = buildEditor({ document: { isInRange: key => key === 'a' }, selection: {} });

      expect(queries.isSelected(editor, node)).toBe(true);
    });

    it('returns false when a single node is not in range', () => {
      const node = makeNode('a', 'paragraph');
      const editor = buildEditor({ document: { isInRange: () => false }, selection: {} });

      expect(queries.isSelected(editor, node)).toBe(false);
    });

    it('returns true only when every node in an array is in range', () => {
      const a = makeNode('a', 'paragraph');
      const b = makeNode('b', 'paragraph');
      const editor = buildEditor({
        document: { isInRange: key => key === 'a' || key === 'b' },
        selection: {},
      });

      expect(queries.isSelected(editor, [a, b])).toBe(true);
    });

    it('returns false when at least one node in an array is not in range', () => {
      const a = makeNode('a', 'paragraph');
      const b = makeNode('b', 'paragraph');
      const editor = buildEditor({
        document: { isInRange: key => key === 'a' },
        selection: {},
      });

      expect(queries.isSelected(editor, [a, b])).toBe(false);
    });
  });

  describe('isFirstChild', () => {
    it('returns true when the node is the first child of its parent', () => {
      const first = makeNode('first', 'paragraph');
      const second = makeNode('second', 'paragraph');
      const root = makeNode('root', 'document', [first, second]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.isFirstChild(editor, first)).toBe(true);
    });

    it('returns false when the node is not the first child of its parent', () => {
      const first = makeNode('first', 'paragraph');
      const second = makeNode('second', 'paragraph');
      const root = makeNode('root', 'document', [first, second]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.isFirstChild(editor, second)).toBe(false);
    });
  });

  describe('areSiblings', () => {
    it('returns true when given fewer than two nodes', () => {
      const node = makeNode('a', 'paragraph');
      const editor = buildEditor({});

      expect(queries.areSiblings(editor, [node])).toBe(true);
    });

    it('returns true when given a non-array value', () => {
      const editor = buildEditor({});

      expect(queries.areSiblings(editor, makeNode('a', 'paragraph'))).toBe(true);
    });

    it('returns true when all nodes share the same parent', () => {
      const a = makeNode('a', 'paragraph');
      const b = makeNode('b', 'paragraph');
      const root = makeNode('root', 'document', [a, b]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.areSiblings(editor, [a, b])).toBe(true);
    });

    it('returns false when the nodes have different parents', () => {
      const a = makeNode('a', 'paragraph');
      const b = makeNode('b', 'paragraph');
      const parentA = makeNode('parentA', 'quote', [a]);
      const parentB = makeNode('parentB', 'quote', [b]);
      const root = makeNode('root', 'document', [parentA, parentB]);
      const document = buildDocument(root);
      const editor = buildEditor({ document });

      expect(queries.areSiblings(editor, [a, b])).toBe(false);
    });
  });

  describe('everyBlock', () => {
    it('returns true when every block matches the type', () => {
      const editor = buildEditor({ blocks: [{ type: 'paragraph' }, { type: 'paragraph' }] });

      expect(queries.everyBlock(editor, 'paragraph')).toBe(true);
    });

    it('returns false when at least one block does not match the type', () => {
      const editor = buildEditor({ blocks: [{ type: 'paragraph' }, { type: 'quote' }] });

      expect(queries.everyBlock(editor, 'paragraph')).toBe(false);
    });
  });

  describe('hasMark', () => {
    it('returns true when an active mark matches the type', () => {
      const editor = buildEditor({ activeMarks: [{ type: 'bold' }] });

      expect(queries.hasMark(editor, 'bold')).toBe(true);
    });

    it('returns false when no active mark matches the type', () => {
      const editor = buildEditor({ activeMarks: [{ type: 'italic' }] });

      expect(queries.hasMark(editor, 'bold')).toBe(false);
    });
  });

  describe('hasBlock', () => {
    it('returns true when a block matches the type', () => {
      const editor = buildEditor({ blocks: [{ type: 'quote' }] });

      expect(queries.hasBlock(editor, 'quote')).toBe(true);
    });

    it('returns false when no block matches the type', () => {
      const editor = buildEditor({ blocks: [{ type: 'paragraph' }] });

      expect(queries.hasBlock(editor, 'quote')).toBe(false);
    });
  });

  describe('hasInline', () => {
    it('returns true when an inline matches the type', () => {
      const editor = buildEditor({ inlines: [{ type: 'link' }] });

      expect(queries.hasInline(editor, 'link')).toBe(true);
    });

    it('returns false when no inline matches the type', () => {
      const editor = buildEditor({ inlines: [{ type: 'image' }] });

      expect(queries.hasInline(editor, 'link')).toBe(false);
    });
  });

  describe('hasQuote', () => {
    it('returns true when a block descendant of a quote is selected', () => {
      const paragraph = makeNode('p', 'paragraph');
      const quote = makeNode('quote', 'quote', [paragraph]);
      const root = makeNode('root', 'document', [quote]);
      const document = buildDocument(root);
      const editor = buildEditor({ document, blocks: [paragraph] });

      expect(queries.hasQuote(editor, 'quote')).toBe(true);
    });

    it('returns false when no selected block is inside a quote', () => {
      const paragraph = makeNode('p', 'paragraph');
      const root = makeNode('root', 'document', [paragraph]);
      const document = buildDocument(root);
      const editor = buildEditor({ document, blocks: [paragraph] });

      expect(queries.hasQuote(editor, 'quote')).toBe(false);
    });
  });

  describe('hasListItems', () => {
    it('returns true when a selected block is a list item inside the given list type', () => {
      const paragraph = makeNode('p', 'paragraph');
      const listItem = makeNode('li', 'list-item', [paragraph]);
      const list = makeNode('list', 'bulleted-list', [listItem]);
      const root = makeNode('root', 'document', [list]);
      const document = buildDocument(root);
      const editor = buildEditor({ document, blocks: [paragraph] });

      expect(queries.hasListItems(editor, 'bulleted-list')).toBe(true);
    });

    it('returns false when the parent is a list item but the list type does not match', () => {
      const paragraph = makeNode('p', 'paragraph');
      const listItem = makeNode('li', 'list-item', [paragraph]);
      const list = makeNode('list', 'numbered-list', [listItem]);
      const root = makeNode('root', 'document', [list]);
      const document = buildDocument(root);
      const editor = buildEditor({ document, blocks: [paragraph] });

      expect(queries.hasListItems(editor, 'bulleted-list')).toBe(false);
    });

    it('returns false when the block is not inside a list item at all', () => {
      const paragraph = makeNode('p', 'paragraph');
      const root = makeNode('root', 'document', [paragraph]);
      const document = buildDocument(root);
      const editor = buildEditor({ document, blocks: [paragraph] });

      expect(queries.hasListItems(editor, 'bulleted-list')).toBe(false);
    });
  });
});
