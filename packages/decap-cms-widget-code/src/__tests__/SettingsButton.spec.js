import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('decap-cms-ui-default', () => {
  const actual = jest.requireActual('decap-cms-ui-default');
  const emotionStyled = jest.requireActual('@emotion/styled').default;

  // The real Icon is an emotion-styled component, and StyledSettingsButton's
  // template literal references it via the `${Icon}` component-selector
  // syntax, which requires an emotion component (not a plain function) to
  // resolve. Mirror the real Icon.js shape: wrap a plain function component
  // with emotion's styled() so the selector keeps working, while exposing
  // `type` as a plain DOM attribute for assertions.
  function InnerIcon({ type, className }) {
    return <span className={className} data-testid="icon" data-type={type} />;
  }
  const Icon = emotionStyled(InnerIcon)``;

  return {
    ...actual,
    Icon,
  };
});

import SettingsButton from '../SettingsButton';

function setup(overrides = {}) {
  const props = {
    showClose: false,
    onClick: jest.fn(),
    ...overrides,
  };

  const utils = render(<SettingsButton {...props} />);
  return { ...utils, props };
}

describe('SettingsButton', () => {
  it('renders Icon with type="settings" when showClose is falsy', () => {
    const { getByTestId } = setup({ showClose: false });
    expect(getByTestId('icon')).toHaveAttribute('data-type', 'settings');
  });

  it('renders Icon with type="close" when showClose is true', () => {
    const { getByTestId } = setup({ showClose: true });
    expect(getByTestId('icon')).toHaveAttribute('data-type', 'close');
  });

  it('invokes the onClick prop when clicked', () => {
    const { getByRole, props } = setup();
    fireEvent.click(getByRole('button'));
    expect(props.onClick).toHaveBeenCalledTimes(1);
  });
});
