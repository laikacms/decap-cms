declare module 'decap-cms-lib-auth' {
  interface ImplicitConfig {
    base_url: string;
    auth_endpoint: string;
    app_id: string;
    clearHash: () => void;
  }

  interface AuthOptions {
    scope: string;
    prompt?: string;
    resource?: string;
  }

  type AuthCallback = (err: Error | null, data?: { token: string; [key: string]: unknown }) => void;

  class ImplicitAuthenticator {
    constructor(config?: Partial<ImplicitConfig>);
    authenticate(options: AuthOptions, cb: AuthCallback): void;
    completeAuth(cb: AuthCallback): void;
  }

  interface PkceConfig {
    use_oidc?: boolean;
    base_url: string;
    auth_endpoint?: string;
    auth_token_endpoint?: string;
    auth_token_endpoint_content_type?: string;
    app_id: string;
  }

  class PkceAuthenticator {
    constructor(config?: Partial<PkceConfig>);
    authenticate(options: AuthOptions, cb: AuthCallback): Promise<void>;
    completeAuth(cb: AuthCallback): Promise<void>;
  }

  class NetlifyAuthenticator {
    constructor(config?: { site_id?: string; base_url?: string; auth_endpoint?: string });

    refresh: (args: {
      provider: string;
      refresh_token: string;
    }) => Promise<{ token: string; refresh_token: string }>;
  }

  const DecapCmsLibAuth: {
    NetlifyAuthenticator: typeof NetlifyAuthenticator;
    ImplicitAuthenticator: typeof ImplicitAuthenticator;
    PkceAuthenticator: typeof PkceAuthenticator;
  };

  export { NetlifyAuthenticator, ImplicitAuthenticator, PkceAuthenticator, DecapCmsLibAuth };
}
