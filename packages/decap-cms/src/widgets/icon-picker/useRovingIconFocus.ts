import { useState } from 'react';

import type React from 'react';

const GRID_COLUMN_COUNT = 4;

export function useRovingIconFocus(iconNames: string[], selectedIconName?: string) {
  const [focusedIconName, setFocusedIconName] = useState<string>();
  const rovingIconName = focusedIconName && iconNames.includes(focusedIconName)
    ? focusedIconName
    : selectedIconName && iconNames.includes(selectedIconName)
    ? selectedIconName
    : iconNames[0];

  const onArrowKeyDown = (event: React.KeyboardEvent<HTMLElement>, index: number) => {
    const offset = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -GRID_COLUMN_COUNT,
      ArrowDown: GRID_COLUMN_COUNT,
    }[event.key];
    if (!offset) {
      return;
    }

    event.preventDefault();
    const nextIndex = Math.max(0, Math.min(iconNames.length - 1, index + offset));
    const nextIcon = event.currentTarget.parentElement?.children[nextIndex] as HTMLElement | undefined;
    setFocusedIconName(iconNames[nextIndex]);
    nextIcon?.focus();
  };

  return {
    onArrowKeyDown,
    onIconFocus: setFocusedIconName,
    rovingIconName,
  };
}
