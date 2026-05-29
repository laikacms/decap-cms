// Logo configuration type
export interface LogoConfig {
  src?: string;
  url?: string;
}

// Backend configuration
export interface BackendConfig {
  base_url?: string;
  app_id?: string;
  auth_endpoint?: string;
  auth_token_endpoint?: string;
}

// Auth configuration
export interface AuthConfigOptions {
  use_oidc?: boolean;
  base_url?: string;
  auth_endpoint?: string;
  auth_token_endpoint?: string;
  app_id?: string;
  auth_token_endpoint_content_type?: string;
  email_claim?: string;
  full_name_claim?: string;
  first_name_claim?: string;
  last_name_claim?: string;
  avatar_url_claim?: string;
  scope?: string;
}

// Config type for authentication
export interface PKCEAuthConfig {
  logo_url?: string;
  logo?: LogoConfig;
  site_url?: string;
  backend: BackendConfig;
  auth?: AuthConfigOptions;
  auth_scope?: string;
}

// User type
export interface PKCEUser {
  email?: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  token?: string;
  access_token?: string;
  id_token?: string;
  claims?: Record<string, unknown>;
  idClaims?: Record<string, unknown>;
}

// JWT Claims type
export interface JWTClaims {
  [key: string]: unknown;
}

// Props interface
export interface PKCEAuthenticationPageProps {
  inProgress?: boolean;
  config: PKCEAuthConfig;
  onLogin: (user: PKCEUser) => void;
  t: (key: string) => string;
}

// State interface
export interface PKCEAuthenticationPageState {
  loginError?: string;
}

// Logo configuration type
export interface LogoConfig {
  src?: string;
  url?: string;
}

// Config type for authentication
export interface AuthConfig {
  logo_url?: string;
  logo?: LogoConfig;
  site_url?: string;
}

// Props interface
export interface NetlifyAuthenticationPageProps {
  onLogin: (user: NetlifyIdentityUser) => void;
  inProgress: boolean;
  error?: React.ReactNode;
  config: AuthConfig;
  t: (key: string) => string;
}

// State interface
export interface NetlifyAuthenticationPageState {
  email: string;
  password: string;
  errors: {
    email?: string;
    password?: string;
    server?: string | Error;
    identity?: string;
  };
  loggingIn?: boolean;
}

// Auth client interface
export interface AuthClient {
  login: (email: string, password: string, remember: boolean) => Promise<NetlifyIdentityUser>;
}

// Netlify Identity User type
export interface NetlifyIdentityUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: Record<string, unknown>;
  token?: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    expires_at: number;
  };
}

export interface NetlifyIdentityWidget {
  on(event: 'init', callback: (user: NetlifyIdentityUser | null) => void): void;
  on(event: 'login', callback: (user: NetlifyIdentityUser) => void): void;
  on(event: 'logout', callback: () => void): void;
  on(event: 'error', callback: (err: Error) => void): void;
  on(event: 'open', callback: () => void): void;
  on(event: 'close', callback: () => void): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  open(tab?: 'login' | 'signup'): void;
  close(): void;
  init(): void;
  currentUser(): NetlifyIdentityUser | null;
  logout(): Promise<void>;
  refresh(force?: boolean): Promise<string>;
  store: {
    user: unknown;
    modal: { page: string };
    saving: boolean;
  };
}

declare global {
  interface Window {
    netlifyIdentity?: NetlifyIdentityWidget;
  }
}
