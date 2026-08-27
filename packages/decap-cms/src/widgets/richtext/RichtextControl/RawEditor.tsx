import { ClassNames, css } from '@emotion/react';
import { SingleBlockPlugin } from 'platejs';
import { ParagraphPlugin, Plate, usePlateEditor } from 'platejs/react';
import { useEffect } from 'react';

import { fonts, lengths } from '@/ui/default/index';
import { editorContainerStyles, EditorControlBar } from '@/widgets/richtext/styles';
import Editor from './components/Editor';
import ParagraphElement from './components/Element/ParagraphElement';
import Toolbar from './components/Toolbar/index';
import defaultEmptyBlock from './defaultEmptyBlock';

import type { CmsWidgetTranslate } from '@/lib/util/index';
import type { RichtextField, RichTextValue } from '@/widgets/richtext/types';

function editorStyles({ minimal }: { minimal?: boolean | undefined }) {
  return css`
    position: relative;
    overflow: hidden;
    overflow-x: auto;
    min-height: ${minimal ? 'auto' : lengths.richTextEditorMinHeight};
    font-family: ${fonts.mono};
    display: flex;
    flex-direction: column;
  `;
}

export interface RawEditorProps {
  onChange: (value: string) => void;
  onMode: (mode: 'raw' | 'rich_text') => void;
  className: string;
  value?: string | undefined;
  field: RichtextField;
  isShowModeToggle: boolean;
  /** Called once focus has been taken, so the parent can clear the request. */
  pendingFocus?: false | (() => void) | undefined;
  t: CmsWidgetTranslate;
}

export default function RawEditor(props: RawEditorProps) {
  const { className, field, isShowModeToggle, t, onChange, value, pendingFocus } = props;

  const initialValue = [defaultEmptyBlock(value || '')];

  const editor = usePlateEditor({
    plugins: [SingleBlockPlugin],
    override: {
      components: {
        [ParagraphPlugin.key]: ParagraphElement,
      },
    },
    value: initialValue,
  });

  useEffect(() => {
    if (pendingFocus) {
      editor.tf.focus({ edge: 'endEditor' });
      pendingFocus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFocus]);

  function handleToggleMode() {
    props.onMode('rich_text');
  }

  function handleChange({ value }: { value: RichTextValue }) {
    onChange(
      value.map(line => {
        const firstChild = line.children[0];
        return firstChild && 'text' in firstChild ? firstChild.text : '';
      }).join('\n'),
    );
  }

  return (
    <Plate editor={editor} onChange={handleChange}>
      <ClassNames>
        {({ cx, css }) => (
          <div
            className={cx(
              className,
              css`
                ${editorContainerStyles}
              `,
            )}
          >
            <EditorControlBar>
              <Toolbar
                onToggleMode={handleToggleMode}
                buttons={field.buttons}
                disabled
                rawMode
                isShowModeToggle={isShowModeToggle}
                t={t}
              />
            </EditorControlBar>
            <div css={editorStyles({ minimal: field.minimal })}>
              <Editor />
            </div>
          </div>
        )}
      </ClassNames>
    </Plate>
  );
}
