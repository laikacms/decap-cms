import { PuzzleIcon } from '@/ui/icons/index';
import { $insertBlock } from '@/lib/richtext/lexical';
import { DropdownMenuItem } from '@/ui/DropdownMenu';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';

import type { BlockDefinition } from '@/lib/richtext';

/** Toolbar insert entry for one registered custom block. */
export function InsertBlock({ definition }: { definition: BlockDefinition }) {
  const { activeEditor } = useToolbarContext();

  return (
    <DropdownMenuItem onClick={() => activeEditor.update(() => $insertBlock(definition))}>
      <div className="flex items-center gap-1">
        {definition.icon ?? <PuzzleIcon className="size-4" />}
        <span>{definition.label ?? definition.id}</span>
      </div>
    </DropdownMenuItem>
  );
}
