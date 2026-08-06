import { act, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import DevAuthenticationPage from '@/backends/laika/DevAuthenticationPage';

describe('DevAuthenticationPage', () => {
  it('does not retry auto-login after authentication failed', async () => {
    const onLogin = vi.fn();

    const first = render(
      <DevAuthenticationPage devToken="dev-token" onLogin={onLogin} />,
    );
    await act(async () => {});
    expect(onLogin).toHaveBeenCalledTimes(1);

    first.unmount();
    render(
      <DevAuthenticationPage
        devToken="dev-token"
        error="Authentication failed"
        onLogin={onLogin}
      />,
    );
    await act(async () => {});

    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});
