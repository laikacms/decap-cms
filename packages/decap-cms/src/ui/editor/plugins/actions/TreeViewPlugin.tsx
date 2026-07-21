import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TreeView } from '@lexical/react/LexicalTreeView';

import { Button } from '@/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/Dialog';
import { NotebookPenIcon } from '@/ui/icons/index';
import { ScrollArea, ScrollBar } from '@/ui/ScrollArea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/Tooltip';

import type { JSX } from 'react';

export function TreeViewPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return (
    <Dialog>
      <Tooltip disableHoverablePopup>
        <TooltipTrigger
          render={
            <DialogTrigger asChild>
              <Button
                size={'sm'}
                variant={'ghost'}
                className="p-2"
                aria-label="Open editor tree view"
              >
                <NotebookPenIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          }
        />
        <TooltipContent>Tree View</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tree View</DialogTitle>
        </DialogHeader>
        <ScrollArea className="bg-foreground text-background h-96 overflow-hidden rounded-lg p-2">
          <TreeView
            viewClassName="tree-view-output"
            treeTypeButtonClassName="debug-treetype-button"
            timeTravelPanelClassName="debug-timetravel-panel"
            timeTravelButtonClassName="debug-timetravel-button"
            timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
            timeTravelPanelButtonClassName="debug-timetravel-panel-button"
            editor={editor}
          />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
