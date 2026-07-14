import { ImageIcon } from 'lucide-react';

import { useToolbarContext } from '@/lib/widgets/editor/context/toolbar-context';
import { InsertImageDialog } from '@/lib/widgets/editor/extensions/images-extension';
import { DropdownMenuItem } from '@/lib/widgets/editor/ui/dropdown-menu';

export function InsertImage() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <DropdownMenuItem
      onClick={() => {
        showModal('Insert Image', onClose => <InsertImageDialog activeEditor={activeEditor} onClose={onClose} />);
      }}
    >
      <div className="flex items-center gap-1">
        <ImageIcon className="size-4" />
        <span>Image</span>
      </div>
    </DropdownMenuItem>
  );
}
