interface NetlifyIdentityWidget {
  on(event: 'init', callback: (user: NetlifyIdentityUser | null) => void): void;
  on(event: 'login', callback: (user: NetlifyIdentityUser) => void): void;
  on(event: 'logout', callback: () => void): void;
  on(event: 'error', callback: (err: Error) => void): void;
  on(event: 'open', callback: () => void): void;
  on(event: 'close', callback: () => void): void;
  open(tab?: 'login' | 'signup'): void;
  close(): void;
  currentUser(): NetlifyIdentityUser | null;
  logout(): Promise<void>;
  refresh(force?: boolean): Promise<string>;
}

declare global {
  interface Window {
    netlifyIdentity?: NetlifyIdentityWidget;
  }
}

export {};
