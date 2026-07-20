import { $isListNode, ListNode } from '@lexical/list';
import { $isHeadingNode } from '@lexical/rich-text';
import { $findMatchingParent, $getNearestNodeOfType } from '@lexical/utils';
import { $isRangeSelection, $isRootOrShadowRoot, type BaseSelection } from 'lexical';

import { Button } from '@/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { useUpdateToolbarHandler } from '@/ui/editor/editor-hooks/useUpdateToolbar';
import { blockTypeToBlockName } from '@/ui/editor/plugins/toolbar/block-format/BlockFormatData';
import { ChevronDownIcon } from '@/ui/icons/index';

export function BlockFormatDropDown({ children }: { children: React.ReactNode }) {
  const { activeEditor, blockType, setBlockType } = useToolbarContext();

  function $updateToolbar(selection: BaseSelection) {
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element = anchorNode.getKey() === 'root'
        ? anchorNode
        : $findMatchingParent(anchorNode, e => {
          const parent = e.getParent();
          return parent !== null && $isRootOrShadowRoot(parent);
        });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
        }
      }
    }
  }

  useUpdateToolbarHandler($updateToolbar);

  const { label, icon } = blockTypeToBlockName[blockType] ?? blockTypeToBlockName.paragraph;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="gap-1 px-2" size="sm">
            {icon}
            <span className="text-sm">{label}</span>
            <ChevronDownIcon className="size-3" />
          </Button>
        }
      />
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
