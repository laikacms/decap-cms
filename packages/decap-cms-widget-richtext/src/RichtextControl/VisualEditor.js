import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { KEYS } from 'platejs';
import { usePlateEditor, Plate, ParagraphPlugin, PlateLeaf } from 'platejs/react';
import {
  BoldPlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  CodePlugin,
  HeadingPlugin,
} from '@platejs/basic-nodes/react';
import { ListPlugin } from '@platejs/list-classic/react';
import { LinkPlugin } from '@platejs/link/react';
import { ClassNames, css } from '@emotion/react';
import { fonts, lengths, zIndex } from 'decap-cms-ui-default';
import { fromJS } from 'immutable';

import { editorContainerStyles, EditorControlBar, editorStyleVars } from '../styles';
import { markdownToSlate, slateToMarkdown } from '../serializers';
import { createChangeGuard } from './valueSync';
import Editor from './components/Editor';
import Toolbar from './components/Toolbar';
import ParagraphElement from './components/Element/ParagraphElement';
import withProps from './withProps';
import CodeLeaf from './components/Leaf/CodeLeaf';
import HeadingElement from './components/Element/HeadingElement';
import ListElement from './components/Element/ListElement';
import BlockquoteElement from './components/Element/BlockquoteElement';
import LinkElement from './components/Element/LinkElement';
import ImageElement from './components/Element/ImageElement';
import ExtendedBlockquotePlugin from './plugins/ExtendedBlockquotePlugin';
import ImagePlugin from './plugins/ImagePlugin';
import BreakPlugin from './plugins/BreakPlugin';
import ShortcodePlugin from './plugins/ShortcodePlugin';
import { TablePlugin, TableRowPlugin, TableCellPlugin } from './plugins/TablePlugin';
import defaultEmptyBlock from './defaultEmptyBlock';
import { mergeMediaConfig } from './mergeMediaConfig';
import { normalizeField } from './normalizeField';
import { handleLinkClick } from './linkHandler';
import { handlePasteHtml } from './pasteHandler';

function editorStyles({ minimal }) {
  return css`
    position: relative;
    font-family: ${fonts.primary};
    min-height: ${minimal ? 'auto' : lengths.richTextEditorMinHeight};
    margin-top: -${editorStyleVars.stickyDistanceBottom};
    padding: 0;
    display: flex;
    flex-direction: column;
    z-index: ${zIndex.zIndex100};
    white-space: pre-wrap;
  `;
}

const emptyValue = [defaultEmptyBlock()];

export default function VisualEditor(props) {
  const {
    t,
    field: rawField,
    className,
    isDisabled,
    isEditorComponent,
    onMode,
    isShowModeToggle,
    onChange,
    getEditorComponents,
    getAsset,
    value: currentValue,
    forID,
    hasErrors,
    errorListId,
  } = props;

  const field = normalizeField(rawField);

  let editorComponents = getEditorComponents();
  const codeBlockComponent = fromJS(editorComponents.find(({ type }) => type === 'code-block'));

  editorComponents =
    codeBlockComponent || editorComponents.has('code-block')
      ? editorComponents
      : editorComponents.set('code-block', { label: 'Code Block', type: 'code-block' });

  mergeMediaConfig(editorComponents, field);

  function handleToggleMode() {
    onMode('raw');
  }

  // DCMS-337: guard against the store-notify -> onChange -> store-update
  // feedback loop by comparing each serialized value against what THIS editor
  // instance last emitted, never against the store-derived `currentValue`
  // prop (see createChangeGuard in ./valueSync).
  const changeGuardRef = useRef(null);
  if (!changeGuardRef.current) {
    changeGuardRef.current = createChangeGuard(currentValue);
  }

  // DCMS-583: keep this handler's identity stable across renders. A fresh
  // closure on every render (re-created solely because the parent's redux
  // round trip re-rendered this component) churns the onChange the Plate
  // store atom is synced to, widening the window in which a re-entrant
  // notification from Plate can slip in before this component has settled.
  // The `changeGuardRef` reentrancy guard (see valueSync.js) is what
  // actually makes re-entrancy structurally harmless; this is a
  // belt-and-suspenders reduction of unnecessary churn.
  const handleChange = useCallback(
    ({ value }) => {
      const mdValue = slateToMarkdown(
        value,
        { voidCodeBlock: !!codeBlockComponent },
        editorComponents,
      );
      // Guards against DCMS-307/DCMS-337/DCMS-583: Plate fires onChange on
      // selection-only changes too, the store may notify back a value this
      // editor instance already emitted (possibly re-serialized slightly
      // differently), and a re-entrant call may arrive synchronously while
      // a previous emit for this instance is still in flight.
      changeGuardRef.current(mdValue, onChange);
    },
    [codeBlockComponent, editorComponents, onChange],
  );

  function handlePaste(event) {
    handlePasteHtml({ event, editor, isDisabled });
  }

  // DCMS-583: memoize so this only re-parses when the underlying markdown
  // actually changes, instead of on every parent re-render (e.g. a toast
  // dismissing or an unrelated field updating). `usePlateEditor` below only
  // consumes this once, at editor creation, but recomputing (and allocating
  // a new Slate tree) on every render was needless churn that widened the
  // timing window this issue's guard now closes structurally.
  const initialValue = useMemo(
    () =>
      props.value
        ? markdownToSlate(props.value, { editorComponents, voidCodeBlock: !!codeBlockComponent })
        : emptyValue,
    [props.value, editorComponents, codeBlockComponent],
  );

  const editor = usePlateEditor({
    override: {
      components: {
        [BoldPlugin.key]: withProps(PlateLeaf, { as: 'b' }),
        [CodePlugin.key]: CodeLeaf,
        [ItalicPlugin.key]: withProps(PlateLeaf, { as: 'em' }),
        [StrikethroughPlugin.key]: withProps(PlateLeaf, { as: 's' }),
        [ParagraphPlugin.key]: withProps(ParagraphElement, { as: 'p' }),
        [KEYS.h1]: withProps(HeadingElement, { variant: 'h1' }),
        [KEYS.h2]: withProps(HeadingElement, { variant: 'h2' }),
        [KEYS.h3]: withProps(HeadingElement, { variant: 'h3' }),
        [KEYS.h4]: withProps(HeadingElement, { variant: 'h4' }),
        [KEYS.h5]: withProps(HeadingElement, { variant: 'h5' }),
        [KEYS.h6]: withProps(HeadingElement, { variant: 'h6' }),
        ['ul']: withProps(ListElement, { variant: 'ul' }),
        ['ol']: withProps(ListElement, { variant: 'ol' }),
        ['li']: withProps(ListElement, { variant: 'li' }),
        ['blockquote']: BlockquoteElement,
        ['image']: withProps(ImageElement, { getAsset, field }),
      },
    },
    plugins: [
      ParagraphPlugin,
      HeadingPlugin.configure({
        shortcuts: {
          h1: { keys: 'mod+1', handler: () => editor.tf.toggleBlock('h1') },
          h2: { keys: 'mod+2', handler: () => editor.tf.toggleBlock('h2') },
          h3: { keys: 'mod+3', handler: () => editor.tf.toggleBlock('h3') },
          h4: { keys: 'mod+4', handler: () => editor.tf.toggleBlock('h4') },
          h5: { keys: 'mod+5', handler: () => editor.tf.toggleBlock('h5') },
          h6: { keys: 'mod+6', handler: () => editor.tf.toggleBlock('h6') },
        },
      }),
      BoldPlugin,
      ItalicPlugin,
      StrikethroughPlugin.configure({
        shortcuts: { toggle: { keys: 'mod+shift+s' } },
      }),
      CodePlugin.configure({
        shortcuts: { toggle: { keys: 'mod+shift+c' } },
      }),
      ListPlugin,
      BreakPlugin,
      ImagePlugin,
      LinkPlugin.configure({
        node: { component: LinkElement },
        shortcuts: {
          toggleLink: {
            keys: 'mod+k',
            handler: () => {
              handleLinkClick({ editor, t });
            },
          },
        },
      }),
      ExtendedBlockquotePlugin.configure({
        node: { component: BlockquoteElement },
      }),
      ShortcodePlugin,
      TablePlugin,
      TableRowPlugin,
      TableCellPlugin,
    ],
    value: initialValue,
  });

  useEffect(() => {
    if (props.pendingFocus) {
      editor.tf.focus({ edge: 'endEditor' });
      props.pendingFocus();
    }
  }, [props.pendingFocus]);

  return (
    <ClassNames>
      {({ css, cx }) => (
        <div
          className={cx(
            className,
            css`
              ${editorContainerStyles}
            `,
          )}
        >
          <Plate editor={editor} onChange={handleChange}>
            <EditorControlBar>
              <Toolbar
                onToggleMode={handleToggleMode}
                buttons={field.get('buttons')}
                editorComponents={editorComponents}
                allowedEditorComponents={field.get('editor_components')}
                isShowModeToggle={isShowModeToggle}
                isEditorComponent={isEditorComponent}
                t={t}
                disabled={isDisabled}
              />
            </EditorControlBar>
            <div css={editorStyles({ minimal: field.get('minimal') })}>
              <Editor
                isDisabled={isDisabled}
                onPaste={handlePaste}
                forID={forID}
                ariaRequired={field.get('required') !== false}
                ariaInvalid={hasErrors}
                ariaErrorMessage={errorListId}
              />
            </div>
          </Plate>
        </div>
      )}
    </ClassNames>
  );
}
