import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CLEAR_EDITOR_COMMAND } from 'lexical';

import { Button } from '@/ui/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/Dialog';
import { Trash2Icon } from '@/ui/icons/index';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/Tooltip';

export function ClearEditorActionPlugin() {
  const [editor] = useLexicalComposerContext();

  return (
    <Dialog>
      <Tooltip disableHoverablePopup>
        <TooltipTrigger
          render={
            <DialogTrigger asChild>
              <Button size={'sm'} variant={'ghost'} className="p-2" aria-label="Clear editor">
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          }
        />
        <TooltipContent>Clear Editor</TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear Editor</DialogTitle>
          <DialogDescription>Are you sure you want to clear the editor?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <DialogClose asChild>
            <Button
              variant="destructive"
              onClick={() => {
                editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
              }}
            >
              Clear
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
