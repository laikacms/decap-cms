import React from 'react';

import { getEditorComponents } from './editorComponents';
import { EditorProvider } from './RichtextControl/editorContext';
import RawEditor from './RichtextControl/RawEditor';
import VisualEditor from './RichtextControl/VisualEditor';

import type { CmsWidgetControlProps } from '@/lib/util/index';
import type { PluggableList } from 'unified';
import type { EditorControlComponent } from './RichtextControl/editorContext';
import type { GetAssetFunction, RichtextField } from './types';

const MODE_STORAGE_KEY = 'cms.md-mode';

type EditorMode = 'raw' | 'rich_text';

const allModes: EditorMode[] = ['rich_text', 'raw'];

/**
 * Props core's `EditorControl` passes on top of the shared widget contract.
 * They are optional so the control can also be rendered standalone (tests,
 * storybook) without a full core around it.
 */
export interface RichtextControlProps extends CmsWidgetControlProps<string, RichtextField> {
  getAsset?: GetAssetFunction | undefined;
  /** The nested control used to edit an editor component's own fields. */
  editorControl?: EditorControlComponent | undefined;
  /** True when this control is itself rendered inside an editor component. */
  isEditorComponent?: boolean | undefined;
  isDisabled?: boolean | undefined;
  /** Remark plugins registered with `CMS.registerRemarkPlugin`. */
  getRemarkPlugins?: (() => PluggableList) | undefined;
}

interface RichtextControlState {
  mode: EditorMode;
  pendingFocus: boolean;
}

function isEditorMode(value: string): value is EditorMode {
  return value === 'raw' || value === 'rich_text';
}

export default class RichtextControl extends React.Component<RichtextControlProps, RichtextControlState> {
  constructor(props: RichtextControlProps) {
    super(props);

    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    const preferredMode: EditorMode = stored !== null && isEditorMode(stored)
      ? stored
      : 'rich_text';
    const allowedModes = this.getAllowedModes(props);

    this.state = {
      // When used inside a container/shortcode editor component, default to
      // rich text mode: the widget type already implies the editing surface.
      mode: props.isEditorComponent
        ? 'rich_text'
        : allowedModes.includes(preferredMode)
        ? preferredMode
        : allowedModes[0],
      pendingFocus: false,
    };
  }

  componentDidMount() {
    // Ensure containerised widgets start in the correct mode even if the
    // constructor ran before the prop was available (e.g. HMR / late prop).
    if (this.props.isEditorComponent && this.state.mode !== 'rich_text') {
      this.setState({ mode: 'rich_text' });
    }
  }

  getAllowedModes(props: RichtextControlProps = this.props): EditorMode[] {
    const modes = props.field.modes;
    return modes && modes.length > 0 ? modes : allModes;
  }

  handleMode = (mode: EditorMode) => {
    this.setState({ mode, pendingFocus: true });
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  };

  setFocusReceived = () => {
    this.setState({ pendingFocus: false });
  };

  focus() {
    this.setState({ pendingFocus: true });
  }

  render() {
    const {
      classNameWrapper,
      field,
      t,
      isDisabled,
      isEditorComponent,
      editorControl,
      onChange,
      getAsset,
      getRemarkPlugins,
      value,
    } = this.props;

    const isShowModeToggle = this.getAllowedModes().length > 1 && !isEditorComponent;
    const { mode, pendingFocus } = this.state;
    const editorComponents = getEditorComponents();
    const remarkPlugins = getRemarkPlugins ? getRemarkPlugins() : [];

    if (mode === 'rich_text') {
      return (
        <EditorProvider editorControl={editorControl} editorComponents={editorComponents}>
          <div className="cms-editor-visual">
            <VisualEditor
              t={t}
              field={field}
              className={classNameWrapper}
              editorComponents={editorComponents}
              remarkPlugins={remarkPlugins}
              isDisabled={isDisabled}
              isEditorComponent={isEditorComponent}
              onMode={this.handleMode}
              isShowModeToggle={isShowModeToggle}
              onChange={onChange}
              getAsset={getAsset}
              pendingFocus={pendingFocus && this.setFocusReceived}
              value={value}
            />
          </div>
        </EditorProvider>
      );
    }

    return (
      <div className="cms-editor-raw">
        <RawEditor
          onChange={onChange}
          isShowModeToggle={isShowModeToggle}
          onMode={this.handleMode}
          className={classNameWrapper}
          value={value}
          field={field}
          pendingFocus={pendingFocus && this.setFocusReceived}
          t={t}
        />
      </div>
    );
  }
}
