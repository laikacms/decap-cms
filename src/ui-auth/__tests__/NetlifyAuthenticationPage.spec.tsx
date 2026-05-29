import React from 'react';
import { render } from '@testing-library/react';

import NetlifyAuthenticationPage from '../NetlifyAuthenticationPage';

window.netlifyIdentity = {
  currentUser: vi.fn(),
  on: vi.fn(),
  close: vi.fn(),
};

describe('NetlifyAuthenticationPage', () => {
  const props = {
    config: { logo: { src: 'logo_url' } },
    t: vi.fn(key => key),
    onLogin: vi.fn(),
    inProgress: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should render with identity error', async () => {
    // Re-import after module reset to re-trigger module-level netlifyIdentity.on() registration
    await import('../NetlifyAuthenticationPage');

    function TestComponent() {
      const { asFragment } = render(<NetlifyAuthenticationPage {...props} />);

      const errorCallback = window.netlifyIdentity.on.mock.calls.find(
        call => call[0] === 'error',
      )[1];

      errorCallback(
        new Error('Failed to load settings from https://site.netlify.com/.netlify/identity'),
      );

      expect(asFragment()).toMatchSnapshot();
    }

    TestComponent();
  });

  test('should render with no identity error', () => {
    function TestComponent() {
      const { asFragment } = render(<NetlifyAuthenticationPage {...props} />);
      expect(asFragment()).toMatchSnapshot();
    }

    TestComponent();
  });
});
