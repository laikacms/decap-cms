import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';

import { DropdownMenuItem } from '@/ui/DropdownMenu';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { ScissorsIcon } from '@/ui/icons/index';

export function InsertHorizontalRule() {
  const { activeEditor } = useToolbarContext();

  return (
    <DropdownMenuItem
      onClick={() => activeEditor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
    >
      <div className="flex items-center gap-1">
        <ScissorsIcon className="size-4" />
        <span>Horizontal Rule</span>
      </div>
    </DropdownMenuItem>
  );
}
