import styled from '@emotion/styled';
import { unwrapList } from '@platejs/list-classic';
import { ParagraphPlugin, useEditorRef, useEditorSelector } from 'platejs/react';

import { Dropdown, DropdownButton, DropdownItem } from '@/ui/default/index';
import ToolbarButton from './ToolbarButton';

import type { CmsWidgetTranslate } from '@/lib/util/index';

const ToolbarDropdownWrapper = styled.div`
  display: inline-block;
  position: relative;
`;

const headingButtonNames = [
  'heading-one',
  'heading-two',
  'heading-three',
  'heading-four',
  'heading-five',
  'heading-six',
] as const;

type HeadingButtonName = typeof headingButtonNames[number];

/** Schema button name -> Plate block type. */
const buttonToBlockType: Record<HeadingButtonName, string> = {
  'heading-one': 'h1',
  'heading-two': 'h2',
  'heading-three': 'h3',
  'heading-four': 'h4',
  'heading-five': 'h5',
  'heading-six': 'h6',
};

const blockTypeToButton: Record<string, HeadingButtonName> = {
  h1: 'heading-one',
  h2: 'heading-two',
  h3: 'heading-three',
  h4: 'heading-four',
  h5: 'heading-five',
  h6: 'heading-six',
};

interface HeadingToolbarButtonProps {
  isVisible: (button: string) => boolean;
  disabled?: boolean | undefined;
  t: CmsWidgetTranslate;
}

export default function HeadingToolbarButton({
  disabled,
  isVisible,
  t,
}: HeadingToolbarButtonProps) {
  const headingLabels: Record<HeadingButtonName, string> = {
    'heading-one': t('editor.editorWidgets.headingOptions.headingOne'),
    'heading-two': t('editor.editorWidgets.headingOptions.headingTwo'),
    'heading-three': t('editor.editorWidgets.headingOptions.headingThree'),
    'heading-four': t('editor.editorWidgets.headingOptions.headingFour'),
    'heading-five': t('editor.editorWidgets.headingOptions.headingFive'),
    'heading-six': t('editor.editorWidgets.headingOptions.headingSix'),
  };

  const editor = useEditorRef();

  const value = useEditorSelector(editor => {
    if (!editor.api.isExpanded()) {
      const entry = editor.api.block();

      if (entry) {
        return entry[0].type;
      }
    }

    return ParagraphPlugin.key;
  }, []);

  function handleChange(buttonName: HeadingButtonName) {
    unwrapList(editor);
    editor.tf.toggleBlock(buttonToBlockType[buttonName]);
    editor.tf.focus();
  }

  if (!headingButtonNames.some(isVisible)) {
    return null;
  }

  return (
    <ToolbarDropdownWrapper>
      <Dropdown
        dropdownWidth="max-content"
        dropdownTopOverlap="36px"
        renderButton={() => (
          <DropdownButton>
            <ToolbarButton
              type="headings"
              label={t('editor.editorWidgets.markdown.headings')}
              icon="h-options"
              disabled={disabled}
              isActive={!disabled && blockTypeToButton[value] !== undefined}
            />
          </DropdownButton>
        )}
      >
        {!disabled
          && headingButtonNames.map(
            optionKey =>
              isVisible(optionKey) && (
                <DropdownItem
                  key={optionKey}
                  label={headingLabels[optionKey]}
                  isActive={blockTypeToButton[value] === optionKey}
                  onClick={() => handleChange(optionKey)}
                />
              ),
          )}
      </Dropdown>
    </ToolbarDropdownWrapper>
  );
}
