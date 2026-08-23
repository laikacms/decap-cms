import { useMarkToolbarButton, useMarkToolbarButtonState } from 'platejs/react';

import ToolbarButton from './ToolbarButton';

import type { ToolbarButtonProps } from './ToolbarButton';

interface MarkToolbarButtonProps extends Omit<ToolbarButtonProps, 'onClick' | 'isActive'> {
  nodeType: string;
  clear?: string | string[] | undefined;
}

export default function MarkToolbarButton({ clear, nodeType, ...rest }: MarkToolbarButtonProps) {
  const state = useMarkToolbarButtonState({ clear, nodeType });
  const {
    props: { pressed, onClick },
  } = useMarkToolbarButton(state);

  return <ToolbarButton isActive={pressed} onClick={onClick} {...rest} />;
}
