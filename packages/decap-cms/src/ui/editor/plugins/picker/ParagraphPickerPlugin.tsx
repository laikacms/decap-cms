import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';

import { TextIcon } from '@/ui/icons/index';
import { ComponentPickerOption } from '@/ui/editor/plugins/picker/ComponentPickerOption';

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
