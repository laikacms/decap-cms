import { $getSelectionStyleValueForProperty, $patchStyleText } from '@lexical/selection';
import { $getSelection, $isRangeSelection, type BaseSelection } from 'lexical';
import { useCallback, useState } from 'react';

import { Button } from '@/ui/Button';
import { ButtonGroup } from '@/ui/ButtonGroup';
import { useToolbarContext } from '@/ui/editor/context/ToolbarContext';
import { useUpdateToolbarHandler } from '@/ui/editor/editor-hooks/useUpdateToolbar';
import { Minus, Plus } from '@/ui/icons/index';
import { Input } from '@/ui/Input';
import { css } from '@/ui/styled';

const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 72;

/*
 * The size input needs a fixed box: `ButtonGroup` gives its direct `input`
 * children `flex: 1` (basis 0), so in the toolbar - which is horizontally
 * scrollable and squeezes its groups - the field collapsed to zero content
 * width and the number was clipped out of sight entirely. Doubling the
 * selector (`&&`) is what lets a single class outrank the group's
 * `& > input` rule; a plain `width` declaration loses to it.
 */
const fontSizeInputClass = css`
  && {
    flex: 0 0 auto;
    width: 3rem;
    height: 2rem;
    padding-inline: 0.25rem;
    text-align: center;
  }
`;

export function FontSizeToolbarPlugin() {
  const style = 'font-size';
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const { activeEditor } = useToolbarContext();

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection)) {
      const value = $getSelectionStyleValueForProperty(
        selection,
        'font-size',
        `${DEFAULT_FONT_SIZE}px`,
      );
      setFontSize(parseInt(value) || DEFAULT_FONT_SIZE);
    }
  };

  useUpdateToolbarHandler($updateToolbar);

  const updateFontSize = useCallback(
    (newSize: number) => {
      const size = Math.min(Math.max(newSize, MIN_FONT_SIZE), MAX_FONT_SIZE);
      activeEditor.update(() => {
        const selection = $getSelection();
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: `${size}px`,
          });
        }
      });
      setFontSize(size);
    },
    [activeEditor, style],
  );

  return (
    <ButtonGroup>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => updateFontSize(fontSize - 1)}
        disabled={fontSize <= MIN_FONT_SIZE}
        aria-label="Decrease font size"
        title="Decrease font size"
      >
        <Minus className="size-3" />
      </Button>
      <Input
        value={fontSize}
        onChange={e => updateFontSize(parseInt(e.target.value) || DEFAULT_FONT_SIZE)}
        css={fontSizeInputClass}
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        aria-label="Font size"
        title="Font size"
      />
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => updateFontSize(fontSize + 1)}
        disabled={fontSize >= MAX_FONT_SIZE}
        aria-label="Increase font size"
        title="Increase font size"
      >
        <Plus className="size-3" />
      </Button>
    </ButtonGroup>
  );
}
