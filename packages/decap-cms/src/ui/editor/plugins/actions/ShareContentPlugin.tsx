import {
  editorStateFromSerializedDocument,
  type SerializedDocument,
  serializedDocumentFromEditorState,
} from '@lexical/file';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CLEAR_HISTORY_COMMAND } from 'lexical';
import { useEffect } from 'react';

import { SendIcon } from '@/ui/icons/index';
import { Button } from '@/ui/Button';
import { docFromHash, docToHash } from '@/ui/editor/utils/doc-serialization';
import { addToast } from '@/ui/toastManager';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/Tooltip';

export function ShareContentPlugin() {
  const [editor] = useLexicalComposerContext();
  async function shareDoc(doc: SerializedDocument): Promise<void> {
    const url = new URL(window.location.toString());
    url.hash = await docToHash(doc);
    const newUrl = url.toString();
    window.history.replaceState({}, '', newUrl);
    await window.navigator.clipboard.writeText(newUrl);
  }
  useEffect(() => {
    docFromHash(window.location.hash).then(doc => {
      if (doc && doc.source === 'editor') {
        editor.setEditorState(editorStateFromSerializedDocument(editor, doc));
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
      }
    });
  }, [editor]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={'ghost'}
            onClick={() =>
              shareDoc(
                serializedDocumentFromEditorState(editor.getEditorState(), {
                  source: 'editor',
                }),
              ).then(
                () => addToast('URL copied to clipboard', 'success'),
                () => addToast('URL could not be copied to clipboard', 'error'),
              )}
            title="Share"
            aria-label="Share Playground link to current editor state"
            size={'sm'}
            className="p-2"
          >
            <SendIcon className="size-4" />
          </Button>
        }
      />
      <TooltipContent>Share Content</TooltipContent>
    </Tooltip>
  );
}
