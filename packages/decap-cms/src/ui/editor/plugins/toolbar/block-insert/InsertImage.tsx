import { DropdownMenuItem } from '@/ui/DropdownMenu';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { InsertImageDialog } from '@/ui/editor/extensions/ImagesExtension';
import { ImageIcon } from '@/ui/icons/index';

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
