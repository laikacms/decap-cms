// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { css } from '@emotion/react';
import omit from 'lodash/omit';
import { ReactEditor, useSlate } from 'slate-react';
import { Range, Transforms } from 'slate';

import { getEditorControl, getEditorComponents } from '../index';

function Shortcode(props) {
  const editor = useSlate();
  const { element, dataKey = 'shortcodeData', children } = props;
  const EditorControl = getEditorControl();
  const plugin = getEditorComponents()[element.data.shortcode];
  const fieldKeys = ['id', 'fromBlock', 'toBlock', 'toPreview', 'pattern', 'icon'];

  const field = omit(plugin, fieldKeys);
  const [value, setValue] = useState(element.data[dataKey]);

  function handleChange(fieldName, value, metadata) {
    const path = ReactEditor.findPath(editor, element);
    const newProperties = {
      data: {
        ...element.data,
        [dataKey]: value,
        metadata,
      },
    };
    Transforms.setNodes(editor, newProperties, {
      at: path,
    });
    setValue(value);
  }

  function handleFocus() {
    const path = ReactEditor.findPath(editor, element);
    Transforms.select(editor, path);
  }

  const path = ReactEditor.findPath(editor, element);
  const isSelected =
    editor.selection &&
    path &&
    Range.isRange(editor.selection) &&
    Range.includes(editor.selection, path);

  return (
    Object.keys(field).length > 0 && (
      <div onClick={handleFocus} onFocus={handleFocus}>
        <EditorControl
          css={css`
            margin-top: 0;
            margin-bottom: 16px;

            &:first-of-type {
              margin-top: 0;
            }
          `}
          value={value}
          field={field}
          onChange={handleChange}
          isEditorComponent={true}
          onValidateObject={() => {}}
          isNewEditorComponent={element.data.shortcodeNew}
          isSelected={isSelected}
        />
        {children}
      </div>
    )
  );
}

export default Shortcode;