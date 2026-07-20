import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';

import { ComponentPickerOption } from '@/ui/editor/plugins/picker/ComponentPickerOption';
import { TextIcon } from '@/ui/icons/index';

export function ParagraphPickerPlugin() {
  return new ComponentPickerOption('Paragraph', {
    icon: <TextIcon className="size-4" />,
    keywords: ['normal', 'paragraph', 'p', 'text'],
    onSelect: (_, editor) =>
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      }),
  });
}
