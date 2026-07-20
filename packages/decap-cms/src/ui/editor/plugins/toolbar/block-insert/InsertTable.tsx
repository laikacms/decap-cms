import { DropdownMenuItem } from '@/ui/DropdownMenu';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { InsertTableDialog } from '@/ui/editor/plugins/TablePlugin';
import { TableIcon } from '@/ui/icons/index';

export function InsertTable() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <DropdownMenuItem
      onClick={() =>
        showModal('Insert Table', onClose => <InsertTableDialog activeEditor={activeEditor} onClose={onClose} />)}
    >
      <div className="flex items-center gap-1">
        <TableIcon className="size-4" />
        <span>Table</span>
      </div>
    </DropdownMenuItem>
  );
}
