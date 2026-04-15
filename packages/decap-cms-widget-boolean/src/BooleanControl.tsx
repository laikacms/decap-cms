import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { Toggle, ToggleBackground, colors } from 'decap-cms-ui-default';

interface BooleanBackgroundProps {
  isActive?: boolean;
}

function BooleanBackground({ isActive, ...props }: BooleanBackgroundProps) {
  return (
    <ToggleBackground
      isActive={isActive}
      style={{
        backgroundColor: isActive ? colors.active : colors.textFieldBorder,
      }}
      {...props}
    />
  );
}

interface BooleanControlProps {
  field: { get: (key: string, defaultValue?: unknown) => unknown };
  onChange: (...args: unknown[]) => unknown;
  classNameWrapper: string;
  setActiveStyle: (...args: unknown[]) => unknown;
  setInactiveStyle: (...args: unknown[]) => unknown;
  forID?: string;
  value?: boolean;
}

export default class BooleanControl extends React.Component<BooleanControlProps> {
  static propTypes = {
    field: ImmutablePropTypes.map.isRequired,
    onChange: PropTypes.func.isRequired,
    classNameWrapper: PropTypes.string.isRequired,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
    forID: PropTypes.string,
    value: PropTypes.bool,
  };

  static defaultProps = {
    value: false,
  };

  render() {
    const { value, forID, onChange, classNameWrapper, setActiveStyle, setInactiveStyle } =
      this.props;
    return (
      <div className={classNameWrapper}>
        <Toggle
          id={forID}
          active={value}
          onChange={onChange}
          onFocus={setActiveStyle}
          onBlur={setInactiveStyle}
          Background={BooleanBackground}
        />
      </div>
    );
  }
}
