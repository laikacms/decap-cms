import React from 'react';

import AuthenticationPage from './AuthenticationPage';
import Icon from './Icon';

function t(key) {
  const dictionary = {
    'ui.default.goBackToSite': 'Go back to site',
  };
  return dictionary[key] || key;
}

function renderButtonContent() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <Icon type="github" size="small" />
      Login with GitHub
    </span>
  );
}

function BasicLogin() {
  return <AuthenticationPage t={t} onLogin={() => {}} renderButtonContent={renderButtonContent} />;
}

function LoginWithGoBack() {
  return (
    <AuthenticationPage
      t={t}
      onLogin={() => {}}
      renderButtonContent={renderButtonContent}
      siteUrl="https://example.com"
    />
  );
}

function LoginWithError() {
  return (
    <AuthenticationPage
      t={t}
      onLogin={() => {}}
      renderButtonContent={renderButtonContent}
      loginErrorMessage="Unable to authenticate, please try again."
    />
  );
}

export default {
  title: 'UI/AuthenticationPage',
  component: AuthenticationPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: BasicLogin,
};

export const WithGoBackButton = {
  render: LoginWithGoBack,
};

export const WithErrorMessage = {
  render: LoginWithError,
};
