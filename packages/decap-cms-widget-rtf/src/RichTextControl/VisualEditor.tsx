// @refresh reset
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { ClassNames } from '@emotion/react';
import { lengths, fonts, zIndex } from 'decap-cms-ui-default';
import styled from '@emotion/styled';
import { createEditor, Transforms, Editor as SlateEditor } from 'slate';
import { Editable, ReactEditor, Slate, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import isEqual from 'lodash/isEqual';
import Immutable from 'immutable';
import withLists from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/lists/withLists';
import withBlocks from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/blocks/withBlocks';
import withInlines from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/inlines/withInlines';
import toggleMark from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/inlines/events/toggleMark';
import toggleLink from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/inlines/events/toggleLink';
import getActiveLink from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/inlines/selectors/getActiveLink';
import isMarkActive from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/inlines/locations/isMarkActive';
import isCursorInBlockType from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/blocks/locations/isCursorInBlockType';
import withShortcodes from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/shortcodes/withShortcodes';
import insertShortcode from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/shortcodes/insertShortcode';
import defaultEmptyBlock from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/blocks/defaultEmptyBlock';
import withHtml from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/html/withHtml';
import Toolbar from 'decap-cms-widget-markdown/src/MarkdownControl/Toolbar';

import { Element, Leaf } from './renderers';
import { editorStyleVars, EditorControlBar } from '../styles';
import withVoidNormalization from './plugins/withVoidNormalization';

import type { FormatConverter } from '../fmt/common';

function visualEditorStyles({ minimal }: any) {
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

export function mergeEmbeddableWidgetsConfig(editorComponents: any, field: any) {
  if (field.has('embeddable_widgets')) {
    const embeddableWidgets = field.get('embeddable_widgets');
    // embeddableWidgets is an object with widget names as keys and config as values
    embeddableWidgets.forEach((config: any) => {
      const realKey = 'embed-' + config.get('name');
      editorComponents = editorComponents.set(realKey, {
        allow_add: true,
        ...config.toObject(),
        fields: config.get('fields') || Immutable.List(), // ensure field is never undefined
        id: realKey,
        fromBlock: (match: RegExpMatchArray | null) =>
          match && {
            collection: match[1],
            entry: match[2],
          },
        toBlock: ({ collection, entry }: any) =>
          `{{< embedded-entry "${collection}" "${entry}" >}}`,
        toPreview: (data: any) => {
          const { collection, entry } = data;

          // In preview mode, show a placeholder with entry info
          return React.createElement(
            'div',
            {
              style: {
                border: '2px dashed #ccc',
                padding: '16px',
                margin: '8px 0',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9',
                textAlign: 'center' as const,
              },
            },
            [
              React.createElement('strong', { key: 'label' }, 'Embedded Entry'),
              React.createElement('br', { key: 'br1' }),
              React.createElement('span', { key: 'collection' }, `Collection: ${collection}`),
              React.createElement('br', { key: 'br2' }),
              React.createElement('span', { key: 'entry' }, `Entry: ${entry}`),
            ],
          );
        },
        pattern: /^{{<\s*embedded-entry\s+"([^"]+)"\s+"([^"]+)"\s*>}}/,
      });
      if (field.has('editor_components')) {
        field.update('editor_components', (components: any) => components.push(realKey));
      }
    });
  }
  return editorComponents;
}

export function mergeMediaConfig(editorComponents: any, field: any) {
  // merge editor media library config to image components
  if (editorComponents.has('image')) {
    const imageComponent = editorComponents.get('image');
    const fields = imageComponent?.fields;

    if (fields) {
      imageComponent.fields = fields.update(
        fields.findIndex((f: any) => f.get('widget') === 'image'),
        (f: any) => {
          // merge `media_library` config
          if (field.has('media_library')) {
            f = f.set(
              'media_library',
              field.get('media_library').mergeDeep(f.get('media_library')),
            );
          }
          // merge 'media_folder'
          if (field.has('media_folder') && !f.has('media_folder')) {
            f = f.set('media_folder', field.get('media_folder'));
          }
          // merge 'public_folder'
          if (field.has('public_folder') && !f.has('public_folder')) {
            f = f.set('public_folder', field.get('public_folder'));
          }
          return f;
        },
      );
    }
  }
}

function Editor(props: any) {
  const {
    onAddAsset,
    getAsset,
    className,
    field,
    t,
    isDisabled,
    getEditorComponents,
    getEditorControl,
    onChange,
    textFormat,
  } = props;

  const editor = useMemo(
    () =>
      withHtml(
        withReact(
          withHistory(
            withVoidNormalization(
              withShortcodes(withBlocks(withLists(withInlines(createEditor())))),
            ),
          ),
        ),
      ),
    [],
  );

  const emptyValue = [defaultEmptyBlock()];
  let editorComponents = getEditorComponents();
  const codeBlockComponent = Immutable.fromJS(
    editorComponents.find(({ type }: any) => type === 'code-block'),
  );

  editorComponents =
    codeBlockComponent || editorComponents.has('code-block')
      ? editorComponents
      : editorComponents.set('code-block', { label: 'Code Block', type: 'code-block' });

  mergeMediaConfig(editorComponents, field);
  editorComponents = mergeEmbeddableWidgetsConfig(editorComponents, field);

  console.log('editorComponents', editorComponents);
  console.log('toolbarEditorComponents', field.get('editor_components'));

  const [editorValue, setEditorValue] = useState(
    props.value ? (textFormat as FormatConverter).toSlate(props.value) : emptyValue,
  );

  useEffect(() => {
    if (props.pendingFocus) {
      ReactEditor.focus(editor);
      props.pendingFocus();
    }
  }, [props.pendingFocus]);

  function handleMarkClick(format: any) {
    ReactEditor.focus(editor);
    toggleMark(editor, format);
  }

  function handleBlockClick(format: any) {
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

  function handleInsertShortcode(pluginConfig: any) {
    insertShortcode(editor, pluginConfig);
  }

  function handleKeyDown(event: any) {
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

  function handleChange(newValue: any) {
    if (!isEqual(newValue, editorValue)) {
      setEditorValue(() => newValue);
      console.log('editor value', newValue);
      const formattedValue = (textFormat as FormatConverter).fromSlate(newValue);
      onChange(formattedValue);
    }
    setToolbarKey(prev => prev + 1);
  }

  function hasMark(format: any) {
    return isMarkActive(editor, format);
  }

  function hasInline(format: any) {
    if (format == 'link') {
      return !!getActiveLink(editor);
    }
    return false;
  }

  function hasBlock(format: any) {
    return isCursorInBlockType(editor, format);
  }
  function hasQuote() {
    return isCursorInBlockType(editor, 'quote');
  }
  function hasListItems(type: any) {
    return isCursorInBlockType(editor, type);
  }

  const renderElement = useCallback(
    (props: any) => (
      <Element
        {...props}
        getEditorComponents={() => editorComponents}
        getEditorControl={getEditorControl}
        classNameWrapper={className}
        codeBlockComponent={codeBlockComponent}
      />
    ),
    [],
  );
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      <Slate editor={editor} initialValue={editorValue} onChange={handleChange}>
        <EditorControlBar>
          {/* @ts-expect-error - Toolbar types from decap-cms-widget-markdown */}
          <Toolbar
            key={toolbarKey}
            onMarkClick={handleMarkClick}
            onBlockClick={handleBlockClick}
            onLinkClick={handleLinkClick}
            plugins={editorComponents}
            onSubmit={handleInsertShortcode}
            onAddAsset={onAddAsset}
            getAsset={getAsset}
            buttons={field.get('buttons')}
            editorComponents={field.get('editor_components')}
            hasMark={hasMark}
            hasInline={hasInline}
            hasBlock={hasBlock}
            hasQuote={hasQuote}
            hasListItems={hasListItems}
            isShowModeToggle={false}
            t={t}
            disabled={isDisabled}
          />
        </EditorControlBar>
        {/* @ts-expect-error - ClassNames render prop types */}
        <ClassNames>
          {({ css, cx }: any) => (
            <div
              className={cx(
                className,
                css`
                  ${visualEditorStyles({ minimal: field.get('minimal') })}
                `,
              )}
            >
              {editorValue.length !== 0 && (
                // @ts-expect-error - Editable types from slate-react
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
      </Slate>
    </div>
  );
}

Editor.propTypes = {
  textFormat: PropTypes.object,
  onAddAsset: PropTypes.func.isRequired,
  getAsset: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string.isRequired,
  value: ImmutablePropTypes.list.isRequired,
  field: ImmutablePropTypes.map.isRequired,
  getEditorComponents: PropTypes.func.isRequired,
  getEditorControl: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  pendingFocus: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  isDisabled: PropTypes.bool,
};

export default Editor;
