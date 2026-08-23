import styled from '@emotion/styled';
import { useEditorRef } from 'platejs/react';
import { useCallback } from 'react';

import { Dropdown, DropdownButton, DropdownItem } from '@/ui/default/index';
import ToolbarButton from './ToolbarButton';

import type { CmsWidgetTranslate } from '@/lib/util/index';
import type { EditorComponent, EditorComponentsRegistry, ShortcodeData } from '@/widgets/richtext/types';

const ToolbarDropdownWrapper = styled.div`
  display: inline-block;
  position: relative;
`;

interface EditorComponentsToolbarButtonProps {
  disabled?: boolean | undefined;
  editorComponents?: EditorComponentsRegistry | undefined;
  allowedEditorComponents?: string[] | undefined;
  t: CmsWidgetTranslate;
}

export default function EditorComponentsToolbarButton({
  disabled,
  editorComponents,
  allowedEditorComponents,
  t,
}: EditorComponentsToolbarButtonProps) {
  const editor = useEditorRef();

  const handleChange = useCallback(
    (plugin: EditorComponent) => {
      const defaultValues: ShortcodeData = {};
      for (const field of plugin.fields) {
        defaultValues[field.name] = field.default ?? '';
      }

      editor.tf.insertNodes(
        {
          children: [{ text: '' }],
          type: 'shortcode',
          data: {
            shortcode: plugin.id,
            shortcodeNew: true,
            shortcodeData: defaultValues,
          },
        },
        {
          removeEmpty: true,
        },
      );
    },
    [editor],
  );

  const editorComponentOptions = editorComponents
    ? [...editorComponents.values()].filter(({ id }) =>
      allowedEditorComponents ? allowedEditorComponents.includes(id) : true
    )
    : [];

  if (editorComponentOptions.length < 1) {
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
              label={t('editor.editorWidgets.markdown.addComponent')}
              icon="add-with"
              disabled={disabled}
              isActive={false}
            />
          </DropdownButton>
        )}
      >
        {!disabled
          && editorComponentOptions.map(option => (
            <DropdownItem
              key={option.id}
              label={option.label}
              onClick={() => handleChange(option)}
            />
          ))}
      </Dropdown>
    </ToolbarDropdownWrapper>
  );
}
