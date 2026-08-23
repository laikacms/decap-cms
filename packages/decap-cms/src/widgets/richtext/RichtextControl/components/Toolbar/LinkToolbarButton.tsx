import { useLinkToolbarButton, useLinkToolbarButtonState } from '@platejs/link/react';
import { useEditorRef } from 'platejs/react';

import { handleLinkClick } from '@/widgets/richtext/RichtextControl/linkHandler';
import ToolbarButton from './ToolbarButton';

import type { CmsWidgetTranslate } from '@/lib/util/index';
import type { ToolbarButtonProps } from './ToolbarButton';

interface LinkToolbarButtonProps extends Omit<ToolbarButtonProps, 'onClick' | 'isActive'> {
  t: CmsWidgetTranslate;
}

export default function LinkToolbarButton({ t, ...rest }: LinkToolbarButtonProps) {
  const state = useLinkToolbarButtonState();
  const {
    props: { pressed },
  } = useLinkToolbarButton(state);

  const editor = useEditorRef();

  function handleClick() {
    handleLinkClick({ editor, t });
  }

  return <ToolbarButton isActive={pressed} onClick={handleClick} {...rest} />;
}
