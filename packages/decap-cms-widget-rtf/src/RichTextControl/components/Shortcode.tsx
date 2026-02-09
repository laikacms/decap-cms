import React, { useState } from 'react';
import { css } from '@emotion/react';
import { fromJS, Iterable } from 'immutable';
import omit from 'lodash/omit';
import noop from 'lodash/noop';
import { ReactEditor, useSlate } from 'slate-react';
import { Range, Transforms } from 'slate';

function Shortcode(props: any) {
  const editor = useSlate() as any;
  const { element, dataKey = 'shortcodeData', children, typeOverload } = props;
  console.log('shortcode props', props);
  const EditorControl = props.getEditorControl();
  const plugin = props.getEditorComponents().get(typeOverload || element.data.shortcode);
  const fieldKeys = ['id', 'fromBlock', 'toBlock', 'toPreview', 'pattern', 'icon'];

  const field = fromJS(omit(plugin, fieldKeys));
  const [value, setValue] = useState(fromJS(element.data[dataKey]));

  function handleChange(fieldName: any, value: any, metadata: any) {
    const path = ReactEditor.findPath(editor, element);
    const newProperties: any = {
      data: {
        ...element.data,
        [dataKey]: Iterable.isIterable(value) ? value.toJS() : value,
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

  return !field.isEmpty() ? (
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
        onValidateObject={noop}
        isNewEditorComponent={element.data.shortcodeNew}
        isSelected={isSelected}
      />
      {children}
    </div>
  ) : null;
}

export default Shortcode;
