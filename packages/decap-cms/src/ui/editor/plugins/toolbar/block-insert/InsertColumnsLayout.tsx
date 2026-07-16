import { Columns3Icon } from 'lucide-react';

import { DropdownMenuItem } from '@/ui/DropdownMenu';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { InsertLayoutDialog } from '@/ui/editor/plugins/LayoutPlugin';

export function InsertColumnsLayout() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <DropdownMenuItem
      onClick={() =>
        showModal(
          'Insert Columns Layout',
          onClose => <InsertLayoutDialog activeEditor={activeEditor} onClose={onClose} />,
        )}
    >
      <div className="flex items-center gap-1">
        <Columns3Icon className="size-4" />
        <span>Columns Layout</span>
      </div>
    </DropdownMenuItem>
  );
}
