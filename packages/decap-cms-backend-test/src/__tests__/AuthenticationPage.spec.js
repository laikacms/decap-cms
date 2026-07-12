import React from 'react';
import { render, screen } from '@testing-library/react';

import AuthenticationPage from '../AuthenticationPage';

describe('TestBackend AuthenticationPage', () => {
  const baseProps = {
    config: { backend: {} },
    t: jest.fn(key => key),
    onLogin: jest.fn(),
    inProgress: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('componentDidMount skipLogin', () => {
    it('calls onLogin automatically when config.backend.login is false', () => {
      const onLogin = jest.fn();
      const props = {
        ...baseProps,
        onLogin,
        config: { backend: { login: false } },
      };

      render(<AuthenticationPage {...props} />);

      expect(onLogin).toHaveBeenCalledTimes(1);
    });

    it('does not call onLogin when login is unset', () => {
      const onLogin = jest.fn();
      const props = {
        ...baseProps,
        onLogin,
        config: { backend: {} },
      };

      render(<AuthenticationPage {...props} />);

      expect(onLogin).not.toHaveBeenCalled();
    });

    it('does not call onLogin when login is true', () => {
      const onLogin = jest.fn();
      const props = {
        ...baseProps,
        onLogin,
        config: { backend: { login: true } },
      };

      render(<AuthenticationPage {...props} />);

      expect(onLogin).not.toHaveBeenCalled();
    });
  });

  describe('handleLogin', () => {
    it('calls onLogin when the login button is clicked', () => {
      const onLogin = jest.fn();
      const props = { ...baseProps, onLogin };

      render(<AuthenticationPage {...props} />);
      onLogin.mockClear();

      screen.getByRole('button').click();

      expect(onLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('GoBackButton', () => {
    it('renders the go back link when config.site_url is set', () => {
      const props = {
        ...baseProps,
        config: { backend: {}, site_url: 'https://example.com' },
      };

      render(<AuthenticationPage {...props} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('does not render the go back link when config.site_url is unset', () => {
      const props = {
        ...baseProps,
        config: { backend: {} },
      };

      render(<AuthenticationPage {...props} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
