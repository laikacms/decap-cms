import { $createCodeNode } from '@lexical/code';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createTextNode, $getRoot, $setSelection } from 'lexical';
import { FileTextIcon } from 'lucide-react';
import { useCallback } from 'react';

import { hasMapper } from '@/lib/richtext';
import { editorStateToSource, sourceToEditorState } from '@/lib/richtext/lexical';
import { Button } from '@/ui/Button';

/**
 * Toggle between the rich-text view and the field's *source* view.
 *
 * The source is produced by the field format's registered mapper via the
 * Portable Text bridge (the exact pipeline the persist path runs), so the
 * text shown (and edited) here is what would be written to disk. The editor
 * itself stays format-agnostic: markdown, HTML or any custom format only
 * needs a registered mapper.
 */
export function SourceTogglePlugin({
  format,
  isSourceView,
  onSourceViewChange,
}: {
  /** Mapper id of the field's format (e.g. 'markdown'). */
  format: string,
  isSourceView: boolean,
  /** Flips the Editor's source-view flag; must be set before the doc mutates. */
  onSourceViewChange: (isSourceView: boolean) => void,
}) {
  const [editor] = useLexicalComposerContext();

  const handleToggle = useCallback(() => {
    if (isSourceView) {
      const source = editor.getEditorState().read(() => $getRoot().getTextContent());
      let parsed;
      try {
        parsed = editor.parseEditorState(sourceToEditorState(source, format));
      } catch (error) {
        // Unparseable source: stay in the source view so nothing is lost.
        console.warn(`[richtext] source is not valid ${format}; staying in source view:`, error);
        return;
      }
      onSourceViewChange(false);
      editor.setEditorState(parsed);
    } else {
      let source;
      try {
        source = editorStateToSource(editor.getEditorState().toJSON(), format);
      } catch (error) {
        console.warn(`[richtext] cannot serialize to ${format}:`, error);
        return;
      }
      onSourceViewChange(true);
      editor.update(() => {
        const root = $getRoot();
        // 'plain' (empty Prism grammar), NOT the format id: real grammars
        // over arbitrary source send the code-highlight transform into an
        // infinite loop (reproduced with JSON-ish content in a fence), which
        // freezes the editor. Correctness over syntax highlighting here.
        const codeNode = $createCodeNode('plain');
        codeNode.append($createTextNode(source));
        root.clear().append(codeNode);
        if (source.length === 0) {
          codeNode.select();
        } else {
          // The whole document was swapped; a remapped caret would only make
          // Lexical steal focus back on the next commit. Let the user place
          // the caret themselves.
          $setSelection(null);
        }
      });
    }
  }, [editor, format, isSourceView, onSourceViewChange]);

  if (!hasMapper(format)) {
    return null;
  }

  return (
    <Button
      variant={'ghost'}
      onClick={handleToggle}
      title={isSourceView ? 'Back to rich text' : `View source (${format})`}
      aria-label={isSourceView ? 'Back to rich text' : `View source (${format})`}
      aria-pressed={isSourceView}
      size={'sm'}
      className="p-2"
    >
      <FileTextIcon className="size-4" />
    </Button>
  );
}
