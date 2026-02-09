import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { List, Map } from 'immutable';
import defaultEmptyBlock from 'decap-cms-widget-markdown/src/MarkdownControl/plugins/blocks/defaultEmptyBlock';

import VisualEditor from './VisualEditor';
import { slateConverter } from '../fmt/slate';
import { getFormat } from '../fmt';

import type Immutable from 'immutable';
import type { FormatConverter } from '../fmt/common';

const MODE_STORAGE_KEY = 'cms.md-mode';

// TODO: passing the editorControl and components like this is horrible, should
// be handled through Redux and a separate registry store for instances
let editorControl: React.ComponentType<any>;
// eslint-disable-next-line func-style
let _getEditorComponents = (): Map<string, any> => Map();

export function getEditorControl(): React.ComponentType<any> {
  return editorControl;
}

export function getEditorComponents(): Map<string, any> {
  return _getEditorComponents();
}

interface MarkdownControlState {
  pendingFocus: boolean;
}

interface MarkdownControlProps {
  textFormatters: FormatConverter[] | undefined;
  onChange: (value: Immutable.List<Node>) => void;
  onAddAsset: (asset: any) => void;
  getAsset: (path: string) => any;
  classNameWrapper: string;
  editorControl: React.ComponentType<any>;
  value?: Immutable.List<Node>;
  field: Map<string, any>;
  getEditorComponents?: () => Map<string, any>;
  t: (key: string) => string;
  getRemarkPlugins?: () => any[];
  resolveWidget?: (widgetName: string) => React.ComponentType<any>;
  isDisabled?: boolean;
}

export default class MarkdownControl extends React.Component<
  MarkdownControlProps,
  MarkdownControlState
> {
  static propTypes = {
    textFormatters: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    onAddAsset: PropTypes.func.isRequired,
    getAsset: PropTypes.func.isRequired,
    classNameWrapper: PropTypes.string.isRequired,
    editorControl: PropTypes.elementType.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, ImmutablePropTypes.list]),
    field: ImmutablePropTypes.map.isRequired,
    getEditorComponents: PropTypes.func,
    t: PropTypes.func.isRequired,
  };

  static defaultProps = {
    value: List(),
  };

  private ref: HTMLDivElement | null = null;

  constructor(props: MarkdownControlProps) {
    super(props);
    editorControl = props.editorControl;

    _getEditorComponents = props.getEditorComponents || (() => Map());
    this.state = {
      pendingFocus: false,
    };
  }

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(MarkdownControl.propTypes, this.props, 'prop', 'MarkdownControl');
  }

  processRef = (ref: HTMLDivElement | null) => (this.ref = ref);

  setFocusReceived = () => {
    this.setState({ pendingFocus: false });
  };

  focus() {
    this.setState({ pendingFocus: true });
  }

  render() {
    const {
      onChange,
      onAddAsset,
      getAsset,
      value,
      classNameWrapper,
      field,
      getEditorComponents,
      t,
      isDisabled,
    } = this.props;

    const { pendingFocus } = this.state;

    const slateValue = value && List.isList(value) ? value.toJS() : [defaultEmptyBlock()];

    const textFormat = getFormat(this.props.textFormatters || [], field) || slateConverter;

    return (
      <div className="cms-editor-visual" ref={this.processRef as any}>
        <VisualEditor
          textFormat={textFormat}
          onChange={onChange}
          onAddAsset={onAddAsset}
          getAsset={getAsset}
          className={classNameWrapper}
          value={slateValue}
          field={field}
          getEditorComponents={getEditorComponents || (() => Map())}
          getEditorControl={() => this.props.editorControl}
          pendingFocus={pendingFocus && this.setFocusReceived}
          t={t}
          isDisabled={isDisabled}
        />
      </div>
    );
  }
}
