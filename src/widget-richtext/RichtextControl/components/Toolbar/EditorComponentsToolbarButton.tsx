// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Dropdown, DropdownButton, DropdownItem } from '../../../../ui-default/index';
import { useEditorRef } from 'platejs/react';

import ToolbarButton from './ToolbarButton';

const ToolbarDropdownWrapper = styled.div`
  display: inline-block;
  position: relative;
`;

function EditorComponentsToolbarButton({ disabled, editorComponents, allowedEditorComponents, t }) {
  const editor = useEditorRef();

  const handleChange = useCallback(
    plugin => {
      const defaultValues = {};
      for (const field of plugin.fields || []) {
        defaultValues[field.name] = field.default ?? '';
      }

      editor.tf.insertNodes(
        {
          children: [{ text: '' }],
          type: 'shortcode',
          isElement: true,
          isVoid: true,
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
    ? Object.values(editorComponents).filter(({ id }) =>
        allowedEditorComponents ? allowedEditorComponents.includes(id) : true,
      )
    : [];

  const showEditorComponents = editorComponentOptions.length >= 1;

  return (
    <>
      {showEditorComponents && (
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
            {!disabled &&
              editorComponentOptions.map(option => (
                <DropdownItem
                  key={option.id}
                  label={option.label}
                  className={''}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleChange(option)}
                />
              ))}
          </Dropdown>
        </ToolbarDropdownWrapper>
      )}
    </>
  );
}

EditorComponentsToolbarButton.propTypes = {
  editorComponents: PropTypes.object,
  allowedEditorComponents: PropTypes.array,
  disabled: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

export default EditorComponentsToolbarButton;