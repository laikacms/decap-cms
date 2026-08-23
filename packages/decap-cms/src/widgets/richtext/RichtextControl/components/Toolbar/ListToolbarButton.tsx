import { useListToolbarButton, useListToolbarButtonState } from '@platejs/list-classic/react';

import ToolbarButton from './ToolbarButton';

import type { IconName } from '@/ui/default/Icon/icons';

interface ListToolbarButtonProps {
  label: string;
  icon?: IconName | undefined;
  type: string;
  disabled?: boolean | undefined;
}

export default function ListToolbarButton({ label, icon, type, disabled }: ListToolbarButtonProps) {
  const state = useListToolbarButtonState({ nodeType: type });

  const {
    props: { pressed, onClick },
  } = useListToolbarButton(state);

  return (
    <ToolbarButton
      label={label}
      icon={icon}
      onClick={onClick}
      isActive={pressed}
      disabled={disabled}
    />
  );
}
