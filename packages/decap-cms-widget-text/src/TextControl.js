import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Textarea from 'react-textarea-autosize';
import { bidiControls, getFieldAriaProps } from 'decap-cms-lib-widgets';

export default class TextControl extends React.Component {
  static propTypes = {
    field: ImmutablePropTypes.map.isRequired,
    onChange: PropTypes.func.isRequired,
    forID: PropTypes.string,
    value: PropTypes.node,
    classNameWrapper: PropTypes.string.isRequired,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
    hasErrors: PropTypes.bool,
    errorListId: PropTypes.string,
  };

  static defaultProps = {
    value: '',
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(TextControl.propTypes, this.props, 'prop', 'TextControl');
  }

  /**
   * Always update to ensure `react-textarea-autosize` properly calculates
   * height. Certain situations, such as this widget being nested in a list
   * item that gets rearranged, can leave the textarea in a minimal height
   * state. Always updating this particular widget should generally be low cost,
   * but this should be optimized in the future.
   */
  shouldComponentUpdate() {
    return true;
  }

  render() {
    const {
      field,
      forID,
      value,
      onChange,
      classNameWrapper,
      setActiveStyle,
      setInactiveStyle,
      hasErrors,
      errorListId,
    } = this.props;
    const hasBidiControls = bidiControls.containsBidiControls(value);

    return (
      <>
        <Textarea
          id={forID}
          value={value || ''}
          className={classNameWrapper}
          onFocus={setActiveStyle}
          onBlur={setInactiveStyle}
          minRows={5}
          css={{ fontFamily: 'inherit' }}
          onChange={e => onChange(e.target.value)}
          {...getFieldAriaProps(field, hasErrors, errorListId)}
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
