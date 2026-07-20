import { InsertImageDialog } from '@/ui/editor/extensions/ImagesExtension';
import { ComponentPickerOption } from '@/ui/editor/plugins/picker/ComponentPickerOption';
import { ImageIcon } from '@/ui/icons/index';

export function ImagePickerPlugin() {
  return new ComponentPickerOption('Image', {
    icon: <ImageIcon className="size-4" />,
    keywords: ['image', 'photo', 'picture', 'file'],
    onSelect: (_, editor, showModal) =>
      showModal('Insert Image', onClose => <InsertImageDialog activeEditor={editor} onClose={onClose} />),
  });
}
