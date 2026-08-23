import { ClassNames, css } from '@emotion/react';
import { BoldPlugin, CodePlugin, HeadingPlugin, ItalicPlugin, StrikethroughPlugin } from '@platejs/basic-nodes/react';
import { LinkPlugin } from '@platejs/link/react';
import { KEYS } from 'platejs';
import { ParagraphPlugin, Plate, PlateLeaf, usePlateEditor } from 'platejs/react';
import { useEffect } from 'react';

import { fonts, lengths, zIndex } from '@/ui/default/index';
import { markdownToSlate, slateToMarkdown } from '@/widgets/richtext/serializers/index';
import { editorContainerStyles, EditorControlBar, editorStyleVars } from '@/widgets/richtext/styles';
import Editor from './components/Editor';
import BlockquoteElement from './components/Element/BlockquoteElement';
import HeadingElement from './components/Element/HeadingElement';
import ImageElement from './components/Element/ImageElement';
import LinkElement from './components/Element/LinkElement';
import ListElement from './components/Element/ListElement';
import ParagraphElement from './components/Element/ParagraphElement';
import CodeLeaf from './components/Leaf/CodeLeaf';
import Toolbar from './components/Toolbar/index';
import defaultEmptyBlock from './defaultEmptyBlock';
import { handleLinkClick } from './linkHandler';
import { mergeMediaConfig } from './mergeMediaConfig';
import { handlePasteHtml } from './pasteHandler';
import BreakPlugin from './plugins/BreakPlugin';
import ExtendedBlockquotePlugin from './plugins/ExtendedBlockquotePlugin';
import ImagePlugin from './plugins/ImagePlugin';
import ListPlugin from './plugins/ListPlugin';
import ShortcodePlugin from './plugins/ShortcodePlugin';
import { TableCellPlugin, TablePlugin, TableRowPlugin } from './plugins/TablePlugin';
import withProps from './withProps';

import type { CmsWidgetTranslate } from '@/lib/util/index';
import type { EditorComponentsRegistry, GetAssetFunction, RichtextField, SlateNode } from '@/widgets/richtext/types';
import type { ClipboardEvent } from 'react';
import type { PluggableList } from 'unified';

function editorStyles({ minimal }: { minimal?: boolean | undefined }) {
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

export interface VisualEditorProps {
  t: CmsWidgetTranslate;
  field: RichtextField;
  className: string;
  value?: string | undefined;
  isDisabled?: boolean | undefined;
  isEditorComponent?: boolean | undefined;
  onMode: (mode: 'raw' | 'rich_text') => void;
  isShowModeToggle: boolean;
  onChange: (value: string) => void;
  editorComponents: EditorComponentsRegistry;
  getAsset?: GetAssetFunction | undefined;
  remarkPlugins?: PluggableList | undefined;
  /** Called once focus has been taken, so the parent can clear the request. */
  pendingFocus?: false | (() => void) | undefined;
}

export default function VisualEditor(props: VisualEditorProps) {
  const {
    t,
    field,
    className,
    isDisabled,
    isEditorComponent,
    onMode,
    isShowModeToggle,
    onChange,
    getAsset,
    remarkPlugins = [],
    pendingFocus,
  } = props;

  // A `code-block` editor component makes code blocks void (edited through the
  // component's own fields instead of inline text). Without one, register a
  // minimal stand-in so code blocks still round-trip.
  const registered = mergeMediaConfig(props.editorComponents, field);
  const codeBlockComponent = [...registered.values()].find(({ type }) => type === 'code-block');

  const editorComponents = codeBlockComponent
    ? registered
    : new Map(registered).set('code-block', {
      id: 'code-block',
      label: 'Code Block',
      type: 'code-block',
      icon: 'code-block',
      widget: 'object',
      pattern: /.^/,
      fields: [],
      fromBlock: () => ({}),
      toBlock: () => '',
    });

  function handleToggleMode() {
    onMode('raw');
  }

  function handleChange({ value }: { value: SlateNode[] }) {
    onChange(
      slateToMarkdown(
        value,
        { voidCodeBlock: !!codeBlockComponent, remarkPlugins },
        editorComponents,
      ),
    );
  }

  function handlePaste(event: ClipboardEvent) {
    handlePasteHtml({ event, editor, isDisabled });
  }

  const initialValue = props.value
    ? markdownToSlate(props.value, {
      editorComponents,
      remarkPlugins,
      voidCodeBlock: !!codeBlockComponent,
    })
    : emptyValue;

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
        ul: withProps(ListElement, { variant: 'ul' }),
        ol: withProps(ListElement, { variant: 'ol' }),
        li: withProps(ListElement, { variant: 'li' }),
        blockquote: BlockquoteElement,
        image: withProps(ImageElement, { getAsset, field }),
      },
    },
    plugins: [
      ParagraphPlugin,
      // The handlers below need `void` block bodies, not expression bodies.
      // `editor` is being initialised by this very call, so an expression
      // body makes its return type depend on `editor`'s type, which depends
      // on this argument: a circular inference. TypeScript 7 reports that as
      // TS7022; TypeScript 6.0.3, which this repo pins, crashes on it with
      // "Debug Failure. No error for last overload signature".
      HeadingPlugin.configure({
        shortcuts: {
          h1: {
            keys: 'mod+1',
            handler: (): void => {
              editor.tf.toggleBlock('h1');
            },
          },
          h2: {
            keys: 'mod+2',
            handler: (): void => {
              editor.tf.toggleBlock('h2');
            },
          },
          h3: {
            keys: 'mod+3',
            handler: (): void => {
              editor.tf.toggleBlock('h3');
            },
          },
          h4: {
            keys: 'mod+4',
            handler: (): void => {
              editor.tf.toggleBlock('h4');
            },
          },
          h5: {
            keys: 'mod+5',
            handler: (): void => {
              editor.tf.toggleBlock('h5');
            },
          },
          h6: {
            keys: 'mod+6',
            handler: (): void => {
              editor.tf.toggleBlock('h6');
            },
          },
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
    if (pendingFocus) {
      editor.tf.focus({ edge: 'endEditor' });
      pendingFocus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFocus]);

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
                buttons={field.buttons}
                editorComponents={editorComponents}
                allowedEditorComponents={field.editor_components}
                isShowModeToggle={isShowModeToggle}
                isEditorComponent={isEditorComponent}
                t={t}
                disabled={isDisabled}
              />
            </EditorControlBar>
            <div css={editorStyles({ minimal: field.minimal })}>
              <Editor isDisabled={isDisabled} onPaste={handlePaste} />
            </div>
          </Plate>
        </div>
      )}
    </ClassNames>
  );
}
