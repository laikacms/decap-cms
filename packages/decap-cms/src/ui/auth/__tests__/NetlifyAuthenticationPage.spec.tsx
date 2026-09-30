import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type NetlifyAuthenticationPage from '@/ui/auth/NetlifyAuthenticationPage';
import type { AuthConfig, NetlifyIdentityUser, NetlifyIdentityWidget } from '@/ui/auth/types';

type Handler = (...args: any[]) => void;
type PageComponent = typeof NetlifyAuthenticationPage;

const user: NetlifyIdentityUser = { id: 'u1', email: 'ada@example.com' };
const config = { site_url: 'https://example.com' } as unknown as AuthConfig;
const t = (key: string) => key;

interface IdentityStub {
  widget: NetlifyIdentityWidget;
  handlers: Record<string, Handler>;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  currentUser: ReturnType<typeof vi.fn>;
}

function stubIdentity(currentUser: NetlifyIdentityUser | null = null): IdentityStub {
  const handlers: Record<string, Handler> = {};
  const open = vi.fn();
  const close = vi.fn();
  const currentUserFn = vi.fn(() => currentUser);
  const widget = {
    on: (event: string, cb: Handler) => {
      handlers[event] = cb;
    },
    open,
    close,
    currentUser: currentUserFn,
  } as unknown as NetlifyIdentityWidget;
  window.netlifyIdentity = widget;
  return { widget, handlers, open, close, currentUser: currentUserFn };
}

async function loadPage(): Promise<PageComponent> {
  vi.resetModules();
  const mod = await import('@/ui/auth/NetlifyAuthenticationPage');
  return mod.default;
}

function renderPage(
  Page: PageComponent,
  props: Partial<React.ComponentProps<PageComponent>> = {},
) {
  const onLogin = vi.fn();
  const utils = render(<Page onLogin={onLogin} inProgress={false} config={config} t={t} {...props} />);
  return { onLogin, ...utils };
}

beforeEach(() => {
  delete window.netlifyIdentity;
});

afterEach(() => {
  cleanup();
  delete window.netlifyIdentity;
});

describe('NetlifyAuthenticationPage with window.netlifyIdentity', () => {
  it('registers login, logout and error listeners at module load', async () => {
    const stub = stubIdentity();
    await loadPage();
    expect(Object.keys(stub.handlers).sort()).toEqual(['error', 'login', 'logout']);
  });

  it('logs in and closes the modal when currentUser() exists on mount', async () => {
    const stub = stubIdentity(user);
    const Page = await loadPage();
    const { onLogin } = renderPage(Page);
    expect(onLogin).toHaveBeenCalledWith(user);
    expect(stub.close).toHaveBeenCalledTimes(1);
  });

  it('does not auto-login when there is no current user', async () => {
    const stub = stubIdentity(null);
    const Page = await loadPage();
    const { onLogin } = renderPage(Page);
    expect(onLogin).not.toHaveBeenCalled();
    expect(stub.close).not.toHaveBeenCalled();
  });

  it('renders the identity login button and opens the modal on click', async () => {
    const stub = stubIdentity(null);
    const Page = await loadPage();
    renderPage(Page);
    fireEvent.click(screen.getByText('auth.loginWithNetlifyIdentity'));
    expect(stub.open).toHaveBeenCalledTimes(1);
  });

  it('calls onLogin with the current user when the button is clicked and a user exists', async () => {
    const stub = stubIdentity(null);
    const Page = await loadPage();
    const { onLogin } = renderPage(Page);
    stub.currentUser.mockReturnValue(user);
    fireEvent.click(screen.getByText('auth.loginWithNetlifyIdentity'));
    expect(onLogin).toHaveBeenCalledWith(user);
    expect(stub.open).not.toHaveBeenCalled();
  });

  it('identity "login" event calls onLogin and closes the modal', async () => {
    const stub = stubIdentity(null);
    const Page = await loadPage();
    const { onLogin } = renderPage(Page);
    act(() => stub.handlers.login(user));
    expect(onLogin).toHaveBeenCalledWith(user);
    expect(stub.close).toHaveBeenCalledTimes(1);
  });

  it('identity "logout" event opens the modal', async () => {
    const stub = stubIdentity(null);
    const Page = await loadPage();
    renderPage(Page);
    act(() => stub.handlers.logout());
    expect(stub.open).toHaveBeenCalledTimes(1);
  });

  it('identity settings "error" closes the modal and shows the docs link', async () => {
    const stub = stubIdentity(null);
    const Page = await loadPage();
    renderPage(Page);
    act(() => stub.handlers.error(new Error('Failed to load settings from https://x.test/.netlify/identity')));
    expect(stub.close).toHaveBeenCalledTimes(1);
    const link = screen.getByText('auth.errors.identitySettings');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toContain('docs.netlify.com');
  });

  it('ignores unrelated identity "error" events', async () => {
    const stub = stubIdentity(null);
    const Page = await loadPage();
    renderPage(Page);
    act(() => stub.handlers.error(new Error('something else')));
    expect(stub.close).not.toHaveBeenCalled();
    expect(screen.queryByText('auth.errors.identitySettings')).toBeNull();
  });

  it('clears handlers on unmount so later events do nothing', async () => {
    const stub = stubIdentity(null);
    const Page = await loadPage();
    const { onLogin, unmount } = renderPage(Page);
    unmount();
    stub.handlers.login(user);
    stub.handlers.logout();
    stub.handlers.error(new Error('Failed to load settings from https://x.test/.netlify/identity'));
    expect(onLogin).not.toHaveBeenCalled();
    expect(stub.open).not.toHaveBeenCalled();
    expect(stub.close).not.toHaveBeenCalled();
  });
});

describe('NetlifyAuthenticationPage without window.netlifyIdentity', () => {
  it('renders the email/password form', async () => {
    const Page = await loadPage();
    renderPage(Page);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('auth.login')).toBeTruthy();
  });

  it('shows the logging-in label while in progress', async () => {
    const Page = await loadPage();
    renderPage(Page, { inProgress: true });
    expect(screen.getByText('auth.loggingIn')).toBeTruthy();
  });

  it('shows the error prop', async () => {
    const Page = await loadPage();
    renderPage(Page, { error: 'boom' });
    expect(screen.getByText('boom')).toBeTruthy();
  });

  it('shows validation errors and skips the client when fields are empty', async () => {
    const Page = await loadPage();
    const authClient = vi.fn();
    Page.authClient = authClient as unknown as typeof Page.authClient;
    const { onLogin } = renderPage(Page);
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);
    expect(await screen.findByText('auth.errors.email')).toBeTruthy();
    expect(screen.getByText('auth.errors.password')).toBeTruthy();
    expect(authClient).not.toHaveBeenCalled();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('calls onLogin with the user on successful login', async () => {
    const Page = await loadPage();
    const login = vi.fn().mockResolvedValue(user);
    Page.authClient = (() => Promise.resolve({ login })) as typeof Page.authClient;
    const { onLogin } = renderPage(Page);
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user));
    expect(login).toHaveBeenCalledWith('ada@example.com', 'secret', true);
  });

  it('shows the server error description when login fails', async () => {
    const Page = await loadPage();
    Page.authClient = (() =>
      Promise.resolve({ login: () => Promise.reject({ description: 'Invalid credentials' }) })) as typeof Page.authClient;
    const { onLogin } = renderPage(Page);
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'nope' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);
    expect(await screen.findByText('Invalid credentials')).toBeTruthy();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('falls back to the stringified error when authClient itself rejects', async () => {
    const Page = await loadPage();
    const { onLogin } = renderPage(Page);
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);
    expect(await screen.findByText('Error: authClient not configured')).toBeTruthy();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
