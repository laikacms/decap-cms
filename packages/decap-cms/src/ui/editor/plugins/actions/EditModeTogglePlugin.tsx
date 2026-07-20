import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useState } from 'react';

import { Button } from '@/ui/Button';
import { LockIcon, UnlockIcon } from '@/ui/icons/index';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/Tooltip';

export function EditModeTogglePlugin() {
  const [editor] = useLexicalComposerContext();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={'ghost'}
            onClick={() => {
              editor.setEditable(!editor.isEditable());
              setIsEditable(editor.isEditable());
            }}
            title="Read-Only Mode"
            aria-label={`${!isEditable ? 'Unlock' : 'Lock'} read-only mode`}
            size={'sm'}
            className="p-2"
          >
            {isEditable ? <LockIcon className="size-4" /> : <UnlockIcon className="size-4" />}
          </Button>
        }
      />
      <TooltipContent>{isEditable ? 'View Only Mode' : 'Edit Mode'}</TooltipContent>
    </Tooltip>
  );
}
