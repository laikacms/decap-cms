import { $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $getSelection, $isRangeSelection } from 'lexical';

import { ComponentPickerOption } from '@/ui/editor/plugins/picker/ComponentPickerOption';
import { QuoteIcon } from '@/ui/icons/index';

export function QuotePickerPlugin() {
  return new ComponentPickerOption('Quote', {
    icon: <QuoteIcon className="size-4" />,
    keywords: ['block quote'],
    onSelect: (_, editor) =>
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      }),
  });
}
