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
import { PaintBucketIcon } from '@/ui/icons/index';

export function FontBackgroundToolbarPlugin() {
  const { activeEditor } = useToolbarContext();

  const [bgColor, setBgColor] = useState('#ffffff');

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection)) {
      setBgColor(
        $getSelectionStyleValueForProperty(
          selection,
          'background-color',
          '#ffffff',
        ),
      );
    }
  };

  useUpdateToolbarHandler($updateToolbar);

  const applyStyleText = useCallback(
    (styles: Record<string, string>, _skipHistoryStack?: boolean) => {
      activeEditor.update(
        () => {
          const selection = $getSelection();
          activeEditor.setEditable(false);
          if (selection !== null) {
            $patchStyleText(selection, styles);
          }
        },
        { tag: 'historic' },
      );
    },
    [activeEditor],
  );

  const onBgColorSelect = useCallback(
    (value: string) => {
      applyStyleText({ 'background-color': value }, true);
    },
    [applyStyleText],
  );

  return (
    <ColorPicker
      modal
      defaultFormat="hex"
      defaultValue={bgColor}
      onValueChange={onBgColorSelect}
      onOpenChange={open => {
        if (!open) {
          activeEditor.setEditable(true);
          activeEditor.focus();
        }
      }}
    >
      <ColorPickerTrigger asChild>
        <Button
          variant={'outline'}
          size={'icon-sm'}
          aria-label="Text background color"
          title="Text background color"
        >
          <PaintBucketIcon className="size-4" />
        </Button>
      </ColorPickerTrigger>
      <ColorPickerContent ariaLabel="Text background color">
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
