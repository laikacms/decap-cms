declare module 'decap-cms-ui-auth' {
  import React from 'react';

  interface PKCEAuthenticationPageProps {
    config: object;
    onLogin: (user: unknown) => void;
    inProgress?: boolean;
    t: (key: string) => string;
  }

  interface NetlifyAuthenticationPageProps {
    config: object;
    onLogin: (user: unknown) => void;
    inProgress: boolean;
    t: (key: string) => string;
    error?: React.ReactNode;
  }

  class PKCEAuthenticationPage extends React.Component<PKCEAuthenticationPageProps> {
    handleLogin(e: React.ChangeEvent<HTMLInputElement>): void;
  }
  class NetlifyAuthenticationPage extends React.Component<NetlifyAuthenticationPageProps> {
    handleLogin(e: React.ChangeEvent<HTMLInputElement>): void;
    static authClient: () => Promise<unknown>;
  }

  export {
    PKCEAuthenticationPage,
    PKCEAuthenticationPageProps,
    NetlifyAuthenticationPage,
    NetlifyAuthenticationPageProps,
  };
}
