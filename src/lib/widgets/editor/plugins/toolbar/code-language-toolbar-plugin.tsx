import { useCallback, useState } from 'react';
import { $isCodeNode } from '@lexical/code';
import { $isListNode } from '@lexical/list';
import { $findMatchingParent } from '@lexical/utils';
import { $getNodeByKey, $isRangeSelection, $isRootOrShadowRoot, type BaseSelection } from 'lexical';

import { useToolbarContext } from '@/lib/widgets/editor/context/toolbar-context';
import { useUpdateToolbarHandler } from '@/lib/widgets/editor/editor-hooks/use-update-toolbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/widgets/editor/ui/select';
import {
  CODE_LANGUAGE_OPTIONS,
  normalizeCodeLanguage,
} from '@/lib/widgets/editor/utils/code-languages';

const CODE_LANGUAGE_ITEMS = CODE_LANGUAGE_OPTIONS.map(([value, label]) => ({ value, label }));

export function CodeLanguageToolbarPlugin() {
  const { activeEditor } = useToolbarContext();
  const [codeLanguage, setCodeLanguage] = useState<string>('');
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
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
        setSelectedElementKey(elementKey);

        if (!$isListNode(element) && $isCodeNode(element)) {
          const language = element.getLanguage();
          setCodeLanguage(language ? normalizeCodeLanguage(language) : '');
          return;
        }
      }
    }
  };

  useUpdateToolbarHandler($updateToolbar);

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      activeEditor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setLanguage(value);
          }
        }
      });
    },
    [activeEditor, selectedElementKey],
  );

  return (
    <Select
      value={codeLanguage || null}
      onValueChange={onCodeLanguageSelect}
      items={CODE_LANGUAGE_ITEMS}
    >
      <SelectTrigger onMouseDown={e => e.stopPropagation()}>
        <SelectValue placeholder="Select Language" />
      </SelectTrigger>
      <SelectContent finalFocus={false}>
        {CODE_LANGUAGE_OPTIONS.map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
