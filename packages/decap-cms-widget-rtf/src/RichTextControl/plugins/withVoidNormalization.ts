import { Editor, Transforms } from 'slate';
import defaultEmptyBlock from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/blocks/defaultEmptyBlock';

/**
 * Plugin to ensure void elements always have a paragraph after them for proper cursor positioning
 */
function withVoidNormalization(editor: any) {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry: any) => {
    const [node] = entry;

    // If this is the editor root, check if we need to add a paragraph after void elements
    if (Editor.isEditor(node)) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const isLastChild = i === node.children.length - 1;
        const nextChild = node.children[i + 1];

        // If this is a void element and it's either the last child or followed by another void element
        if (editor.isVoid(child) && (isLastChild || (nextChild && editor.isVoid(nextChild)))) {
          // Insert a paragraph after this void element
          Transforms.insertNodes(editor, defaultEmptyBlock(), { at: [i + 1] });
          return; // Exit early to let Slate re-normalize
        }
      }
    }

    normalizeNode(entry);
  };

  return editor;
}

export default withVoidNormalization;
