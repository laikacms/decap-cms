import { $getSelectionStyleValueForProperty, $patchStyleText } from '@lexical/selection';
import { $getSelection, $isRangeSelection, type BaseSelection } from 'lexical';
import { useCallback, useState } from 'react';

import { Button } from '@/ui/Button';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { useUpdateToolbarHandler } from '@/ui/editor/editor-hooks/useUpdateToolbar';
import {
  ColorPicker,
  ColorPickerAlphaSlider,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerEyeDropper,
  ColorPickerFormatSelect,
  ColorPickerHueSlider,
  ColorPickerInput,
  ColorPickerTrigger,
} from '@/ui/editor/editor-ui/ColorPicker';
import { BaselineIcon } from '@/ui/icons/index';

export function FontColorToolbarPlugin() {
  const { activeEditor } = useToolbarContext();

  const [fontColor, setFontColor] = useState('#000000');

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection)) {
      setFontColor(
        $getSelectionStyleValueForProperty(selection, 'color', '#000000'),
      );
    }
  };

  useUpdateToolbarHandler($updateToolbar);

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      activeEditor.update(() => {
        const selection = $getSelection();
        activeEditor.setEditable(false);
        if (selection !== null) {
          $patchStyleText(selection, styles);
        }
      });
    },
    [activeEditor],
  );

  const onFontColorSelect = useCallback(
    (value: string) => {
      applyStyleText({ color: value });
    },
    [applyStyleText],
  );

  return (
    <ColorPicker
      modal
      defaultFormat="hex"
      defaultValue={fontColor}
      onValueChange={onFontColorSelect}
      onOpenChange={open => {
        if (!open) {
          activeEditor.setEditable(true);
          activeEditor.focus();
        }
      }}
    >
      <ColorPickerTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="Text color" title="Text color">
          <BaselineIcon className="size-4" />
        </Button>
      </ColorPickerTrigger>
      <ColorPickerContent ariaLabel="Text color">
        <ColorPickerArea />
        <div className="flex items-center gap-2">
          <ColorPickerEyeDropper />
          <div className="flex flex-1 flex-col gap-2">
            <ColorPickerHueSlider />
            <ColorPickerAlphaSlider />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ColorPickerFormatSelect />
          <ColorPickerInput />
        </div>
      </ColorPickerContent>
    </ColorPicker>
  );
}
