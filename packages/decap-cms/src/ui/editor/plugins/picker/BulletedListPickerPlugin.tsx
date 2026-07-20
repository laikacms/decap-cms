import { INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';

import { ComponentPickerOption } from '@/ui/editor/plugins/picker/ComponentPickerOption';
import { ListIcon } from '@/ui/icons/index';

export function BulletedListPickerPlugin() {
  return new ComponentPickerOption('Bulleted List', {
    icon: <ListIcon className="size-4" />,
    keywords: ['bulleted list', 'unordered list', 'ul'],
    onSelect: (_, editor) => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
  });
}
