// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
// @refresh reset
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ClassNames, css as coreCss } from '@emotion/react';
import { lengths, fonts, zIndex } from '../../ui-default/index';
import styled from '@emotion/styled';
import { createEditor, Transforms, Editor as SlateEditor } from 'slate';
import { Editable, ReactEditor, Slate, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';

import { editorStyleVars, EditorControlBar } from '../styles';
import Toolbar from './Toolbar';
import { Element, Leaf } from './renderers';
import withLists from './plugins/lists/withLists';
import withBlocks from './plugins/blocks/withBlocks';
import withInlines from './plugins/inlines/withInlines';
import toggleMark from './plugins/inlines/events/toggleMark';
import toggleLink from './plugins/inlines/events/toggleLink';
import getActiveLink from './plugins/inlines/selectors/getActiveLink';
import isMarkActive from './plugins/inlines/locations/isMarkActive';
import isCursorInBlockType from './plugins/blocks/locations/isCursorInBlockType';
import { markdownToSlate, slateToMarkdown } from '../serializers';
import withShortcodes from './plugins/shortcodes/withShortcodes';
import insertShortcode from './plugins/shortcodes/insertShortcode';
import defaultEmptyBlock from './plugins/blocks/defaultEmptyBlock';
import withHtml from './plugins/html/withHtml';

function visualEditorStyles({ minimal }) {
  return `
  position: relative;
  overflow: auto;
  font-family: ${fonts.primary};
  min-height: ${minimal ? 'auto' : lengths.richTextEditorMinHeight};
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: 0;
  margin-top: -${editorStyleVars.stickyDistanceBottom};
  padding: 0;
  display: flex;
  flex-direction: column;
  z-index: ${zIndex.zIndex100};
`;
}

const InsertionPoint = styled.div`
  flex: 1 1 auto;
  cursor: text;
`;

export function mergeMediaConfig(editorComponents, field) {
  // merge editor media library config to image components
  const imageComponent = editorComponents['image'];
  const fields = imageComponent?.fields;
  if (!fields) {
    return;
  }

  const index = fields.findIndex(f => f.widget === 'image');
  if (index === -1) {
    return;
  }

  const f = { ...fields[index] };
  // merge `media_library` config
  if (field.media_library != null) {
    f.media_library = merge({}, field.media_library, f.media_library);
  }
  // merge 'media_folder'
  if (field.media_folder != null && f.media_folder == null) {
    f.media_folder = field.media_folder;
  }
  // merge 'public_folder'
  if (field.public_folder != null && f.public_folder == null) {
    f.public_folder = field.public_folder;
  }
  imageComponent.fields = fields.map((existing, i) => (i === index ? f : existing));
}

function Editor(props) {
  const {
    onAddAsset,
    getAsset,
    className,
    field,
    isShowModeToggle,
    t,
    isDisabled,
    getEditorComponents,
    getRemarkPlugins,
    onChange,
  } = props;

  const editor = useMemo(
    () =>
      withHtml(
        withReact(withHistory(withShortcodes(withBlocks(withLists(withInlines(createEditor())))))),
      ),
    [],
  );

  const emptyValue = [defaultEmptyBlock()];
  let editorComponents = getEditorComponents();
  const codeBlockComponent = Object.values(editorComponents).find(
    ({ type }) => type === 'code-block',
  );

  editorComponents =
    codeBlockComponent || editorComponents['code-block']
      ? editorComponents
      : { ...editorComponents, 'code-block': { label: 'Code Block', type: 'code-block' } };

  mergeMediaConfig(editorComponents, field);

  const [editorValue, setEditorValue] = useState(
    props.value
      ? markdownToSlate(props.value, {
          voidCodeBlock: !!codeBlockComponent,
          remarkPlugins: getRemarkPlugins(),
        })
      : emptyValue,
  );

  const renderElement = useCallback(
    props => (
      <Element {...props} classNameWrapper={className} codeBlockComponent={codeBlockComponent} />
    ),
    [],
  );
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);

  useEffect(() => {
    if (props.pendingFocus) {
      ReactEditor.focus(editor);
      props.pendingFocus();
    }
  }, [props.pendingFocus]);

  function handleMarkClick(format) {
    ReactEditor.focus(editor);
    const markFormat = format === 'strikethrough' ? 'delete' : format;
    toggleMark(editor, markFormat);
  }

  function handleBlockClick(format) {
    ReactEditor.focus(editor);
    if (format.endsWith('-list')) {
      editor.toggleList(format);
    } else {
      editor.toggleBlock(format);
    }
  }

  function handleLinkClick() {
    toggleLink(editor, t('editor.editorWidgets.markdown.linkPrompt'));
    ReactEditor.focus(editor);
  }

  function handleToggleMode() {
    props.onMode('raw');
  }

  function handleInsertShortcode(pluginConfig) {
    insertShortcode(editor, pluginConfig);
  }

  function handleKeyDown(event) {
    for (const handler of editor.keyDownHandlers || []) {
      if (handler(event, editor) === false) {
        break;
      }
    }
    ReactEditor.focus(editor);
  }

  function handleClickBelowDocument() {
    ReactEditor.focus(editor);
    Transforms.select(editor, { path: [0, 0], offset: 0 });
    Transforms.select(editor, SlateEditor.end(editor, []));
  }
  const [toolbarKey, setToolbarKey] = useState(0);

  function handleChange(newValue) {
    if (!isEqual(newValue, editorValue)) {
      setEditorValue(() => newValue);
      onChange(
        slateToMarkdown(newValue, {
          voidCodeBlock: !!codeBlockComponent,
          remarkPlugins: getRemarkPlugins(),
        }),
      );
    }
    setToolbarKey(prev => prev + 1);
  }

  function hasMark(format) {
    return isMarkActive(editor, format);
  }

  function hasInline(format) {
    if (format == 'link') {
      return !!getActiveLink(editor);
    }
    return false;
  }

  function hasBlock(format) {
    return isCursorInBlockType(editor, format);
  }
  function hasQuote() {
    return isCursorInBlockType(editor, 'quote');
  }
  function hasListItems(type) {
    return isCursorInBlockType(editor, type);
  }

  return (
    <div
      css={coreCss`
        position: relative;
      `}
    >
      <Slate editor={editor} value={editorValue} initialValue={editorValue} onChange={handleChange}>
        <EditorControlBar>
          {
            <Toolbar
              key={toolbarKey}
              onMarkClick={handleMarkClick}
              onBlockClick={handleBlockClick}
              onLinkClick={handleLinkClick}
              onToggleMode={handleToggleMode}
              plugins={editorComponents}
              onSubmit={handleInsertShortcode}
              onAddAsset={onAddAsset}
              getAsset={getAsset}
              buttons={field.buttons}
              editorComponents={field.editor_components}
              hasMark={hasMark}
              hasInline={hasInline}
              hasBlock={hasBlock}
              hasQuote={hasQuote}
              hasListItems={hasListItems}
              isShowModeToggle={isShowModeToggle}
              t={t}
              disabled={isDisabled}
            />
          }
        </EditorControlBar>
        {
          <ClassNames>
            {({ css, cx }) => (
              <div
                className={cx(
                  className,
                  css`
                    ${visualEditorStyles({ minimal: field.minimal })}
                  `,
                )}
              >
                {editorValue.length !== 0 && (
                  <Editable
                    className={css`
                      padding: 16px 20px 0;
                    `}
                    renderElement={renderElement}
                    renderLeaf={renderLeaf}
                    onKeyDown={handleKeyDown}
                    autoFocus={false}
                  />
                )}
                <InsertionPoint onClick={handleClickBelowDocument} />
              </div>
            )}
          </ClassNames>
        }
      </Slate>
    </div>
  );
}

Editor.propTypes = {
  onAddAsset: PropTypes.func.isRequired,
  getAsset: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onMode: PropTypes.func.isRequired,
  className: PropTypes.string.isRequired,
  value: PropTypes.string,
  field: PropTypes.object.isRequired,
  getEditorComponents: PropTypes.func.isRequired,
  getRemarkPlugins: PropTypes.func.isRequired,
  isShowModeToggle: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
};

export default Editor;