import React from 'react';
import PropTypes from 'prop-types';
import { bidiControls } from 'decap-cms-lib-widgets';

export default class StringControl extends React.Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    forID: PropTypes.string,
    value: PropTypes.node,
    classNameWrapper: PropTypes.string.isRequired,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
  };

  static defaultProps = {
    value: '',
  };

  // The selection to maintain for the input element
  _sel = 0;

  // The input element ref
  _el = null;

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(StringControl.propTypes, this.props, 'prop', 'StringControl');
  }

  // NOTE: This prevents the cursor from jumping to the end of the text for
  // nested inputs. In other words, this is not an issue on top-level text
  // fields such as the `title` of a collection post. However, it becomes an
  // issue on fields nested within other components, namely widgets nested
  // within a `markdown` widget. For example, the alt text on a block image
  // within markdown.
  // SEE: https://github.com/decaporg/decap-cms/issues/4539
  // SEE: https://github.com/decaporg/decap-cms/issues/3578
  componentDidUpdate() {
    if (this._el && this._el.selectionStart !== this._sel) {
      this._el.setSelectionRange(this._sel, this._sel);
    }
  }

  handleChange = e => {
    this._sel = e.target.selectionStart;
    this.props.onChange(e.target.value);
  };

  render() {
    const { forID, value, classNameWrapper, setActiveStyle, setInactiveStyle } = this.props;
    const hasBidiControls = bidiControls.containsBidiControls(value);

    return (
      <>
        <input
          ref={el => {
            this._el = el;
          }}
          type="text"
          id={forID}
          className={classNameWrapper}
          value={value || ''}
          onChange={this.handleChange}
          onFocus={setActiveStyle}
          onBlur={setInactiveStyle}
        />
        {hasBidiControls && (
          <span
            role="alert"
            title="This value contains an invisible Unicode bidi control character (e.g. U+202E RIGHT-TO-LEFT OVERRIDE), which can make it render very differently from how it is stored. This can be used to spoof file names/titles (Trojan Source). Review the raw value carefully before saving."
            css={{ color: '#c53030', marginLeft: '4px', cursor: 'help' }}
          >
            ⚠
          </span>
        )}
      </>
    );
  }
}
