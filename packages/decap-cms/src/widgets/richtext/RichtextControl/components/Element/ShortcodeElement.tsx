import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { omit } from 'lodash-es';
import { ParagraphPlugin, PlateElement, useEditorRef, useEditorSelection, useEditorState } from 'platejs/react';
import React, { useState } from 'react';
import { Range } from 'slate';

import { zIndex } from '@/ui/default/index';
import { useEditorContext } from '@/widgets/richtext/RichtextControl/editorContext';

import type { ShortcodeData } from '@/widgets/richtext/types';
import type { PlateElementProps } from 'platejs/react';
import type { HTMLAttributes } from 'react';

const StyledDiv = styled.div``;

function InsertionPoint(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      css={css`
        height: 32px;
        cursor: text;
        position: relative;
        z-index: ${zIndex.zIndex1};
        margin-top: -16px;
      `}
      {...props}
    />
  );
}

/** Editor component properties that are behaviour, not editable fields. */
const behaviourKeys = ['id', 'fromBlock', 'toBlock', 'toPreview', 'pattern', 'icon'];

interface ShortcodeElementProps extends PlateElementProps {
  /** Which key of `element.data` holds the component's field values. */
  dataKey?: string | undefined;
}

function isShortcodeData(value: unknown): value is ShortcodeData {
  return typeof value === 'object' && value !== null;
}

export default function ShortcodeElement(props: ShortcodeElementProps) {
  const editor = useEditorRef();
  const editorState = useEditorState();
  const { attributes, element, dataKey = 'shortcodeData', children } = props;
  const { editorControl: EditorControl, editorComponents } = useEditorContext();

  const shortcodeId = typeof element.data?.shortcode === 'string' ? element.data.shortcode : '';
  const plugin = editorComponents.get(shortcodeId);

  const initialValue = element.data?.[dataKey];
  const [value, setValue] = useState<ShortcodeData>(
    isShortcodeData(initialValue) ? { ...initialValue } : { id: '' },
  );

  const selection = useEditorSelection();
  const path = editor.api.findPath(element);
  const isSelected = !!selection && !!path && Range.isRange(selection)
    && Range.includes(selection, path);
  const insertBefore = path?.[0] === 0;
  const insertAfter = path !== undefined
    && (path[0] === editorState.children.length - 1
      || editor.isVoid(editorState.children[path[0] + 1]));

  function handleChange(_fieldName: string, nextValue: ShortcodeData, metadata?: unknown) {
    if (!path) return;

    editor.tf.setNodes(
      {
        data: {
          ...element.data,
          [dataKey]: nextValue,
          metadata,
        },
      },
      { at: path },
    );
    setValue(nextValue);
  }

  function handleInsertBefore() {
    if (!path) return;
    editor.tf.insertNodes(
      { type: ParagraphPlugin.key, children: [{ text: '' }] },
      { at: path, select: true },
    );
  }

  function handleInsertAfter(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    editor.tf.insertNodes({ type: ParagraphPlugin.key, children: [{ text: '' }] }, {
      select: true,
    });
  }

  // The editor component's field definitions double as the "field" the nested
  // control renders, minus the properties that describe behaviour.
  const field = plugin ? omit(plugin, behaviourKeys) : undefined;

  return (
    <PlateElement asChild {...props}>
      {insertBefore && <InsertionPoint onClick={handleInsertBefore} />}
      <StyledDiv {...attributes} contentEditable={false}>
        {EditorControl && field && (
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
            isNewEditorComponent={element.data?.shortcodeNew}
            isSelected={isSelected}
          />
        )}
        {children}
      </StyledDiv>
      {insertAfter && <InsertionPoint onClick={handleInsertAfter} />}
    </PlateElement>
  );
}
