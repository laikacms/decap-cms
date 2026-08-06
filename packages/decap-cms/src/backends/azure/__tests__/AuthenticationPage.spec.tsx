import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AzureAuthenticationPage from '@/backends/azure/AuthenticationPage';

const t = (key: string) => key;

describe('AzureAuthenticationPage - personal access token login (DCMS-1400)', () => {
  const config = { backend: { tenant_id: 'contoso', app_id: 'app', pat_auth: true } };

  it('does not render a token form when pat_auth is not configured', () => {
    render(<AzureAuthenticationPage config={{ backend: {} }} onLogin={vi.fn()} t={t} />);

    expect(screen.queryByPlaceholderText('Azure DevOps personal access token')).toBeNull();
  });

  it('encodes the pasted PAT as an HTTP Basic auth header, not Bearer', () => {
    // Azure DevOps' REST API only accepts a PAT via Basic auth (empty
    // username); Bearer is reserved for OAuth access tokens. `API.tsx`'s
    // `withHeaders` passes `token` through verbatim when it already starts
    // with "Basic ", so the auth page must pre-encode it that way.
    const onLogin = vi.fn();
    render(<AzureAuthenticationPage config={config} onLogin={onLogin} t={t} />);

    fireEvent.change(screen.getByPlaceholderText('Azure DevOps personal access token'), {
      target: { value: 'my-azure-pat' },
    });
    fireEvent.submit(screen.getByText('auth.loginWithToken').closest('form')!);

    expect(onLogin).toHaveBeenCalledTimes(1);
    const [{ token }] = onLogin.mock.calls[0];
    expect(token).toBe(`Basic ${btoa(':my-azure-pat')}`);
    expect(token.startsWith('Basic ')).toBe(true);
  });
});
