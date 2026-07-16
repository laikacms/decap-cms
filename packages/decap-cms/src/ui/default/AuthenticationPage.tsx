import styled from '@emotion/styled';
import React from 'react';

import GoBackButton from './GoBackButton';
import Icon from './Icon';
import { buttons, colors, shadows } from './styles';

import type { TranslateFunction } from './GoBackButton';

/**
 * `AuthenticationPage` is content-only: the login error, the optional page
 * content, the login button, and the go-back link. It never renders page
 * chrome (brand logo, Decap credit, full-page centering) — that belongs to
 * whatever hosts it: `StandaloneAuthPage` below on the default `app` path,
 * or a custom `renderAuth` shell like laika-app's auth card.
 */
const StyledAuthenticationPage = styled.section`
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 20px;
`;

const StyledStandaloneAuthPage = styled.section`
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 50px;
`;

const CustomIconWrapper = styled.span`
  width: 300px;
  height: auto;
  text-align: center;
  margin-bottom: 1rem;
`;

const DecapLogoIcon = styled(Icon)`
  height: auto;
  color: ${colors.textLead};
`;

const NetlifyCreditIcon = styled(Icon)`
  color: #c4c6d2;
  position: absolute;
  bottom: 10px;
`;

interface CustomLogoIconProps {
  url: string;
}

function CustomLogoIcon({ url }: CustomLogoIconProps): React.ReactElement {
  return (
    <CustomIconWrapper>
      <img src={url} alt="Logo" />
    </CustomIconWrapper>
  );
}

function renderPageLogo(logoUrl?: string): React.ReactElement {
  if (logoUrl) {
    return <CustomLogoIcon url={logoUrl} />;
  }
  return <DecapLogoIcon size="300px" type="decap" />;
}

const LoginButton = styled.button`
  ${buttons.button};
  ${shadows.dropDeep};
  ${buttons.default};
  ${buttons.gray};
  &[disabled] {
    ${buttons.disabled};
  }

  padding: 0 12px;
  margin-top: 0;
  display: flex;
  align-items: center;
  position: relative;
`;

const TextButton = styled.button`
  ${buttons.button};
  ${buttons.default};
  ${buttons.grayText};

  margin-top: 0;
  display: flex;
  align-items: center;
  position: relative;
`;

export interface LogoConfig {
  src?: string;
  show_in_header?: boolean;
}

export interface PageContentRenderProps {
  LoginButton: typeof LoginButton;
  TextButton: typeof TextButton;
  showAbortButton: boolean;
}

export interface AuthenticationPageProps {
  onLogin?: (e: any) => void;
  loginDisabled?: boolean;
  loginErrorMessage?: React.ReactNode;
  renderButtonContent?: () => React.ReactNode;
  renderPageContent?: (props: PageContentRenderProps) => React.ReactNode;
  siteUrl?: string;
  t: TranslateFunction;
}

function AuthenticationPage({
  onLogin,
  loginDisabled,
  loginErrorMessage,
  renderButtonContent,
  renderPageContent,
  siteUrl,
  t,
}: AuthenticationPageProps): React.ReactElement {
  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onLogin) {
      e.preventDefault();
      onLogin(e);
    }
  };
  return (
    <StyledAuthenticationPage>
      {loginErrorMessage ? <p>{loginErrorMessage}</p> : null}
      {!renderPageContent
        ? null
        : renderPageContent({ LoginButton, TextButton, showAbortButton: !siteUrl })}
      {!renderButtonContent ? null : (
        <LoginButton disabled={loginDisabled} onClick={handleLogin}>
          {renderButtonContent()}
        </LoginButton>
      )}
      {siteUrl && <GoBackButton href={siteUrl} t={t} />}
    </StyledAuthenticationPage>
  );
}

export interface StandaloneAuthPageProps {
  logoUrl?: string; // Deprecated, replaced by `logo.src`
  logo?: LogoConfig;
  children: React.ReactNode;
}

/**
 * Full-page chrome around a backend's (content-only) auth component: viewport
 * centering, the brand logo from config (falling back to the Decap logo), and
 * the Decap credit when a custom logo displaces it. The default `app` auth
 * path wraps `AuthComponent` with this; custom `renderAuth` shells supply
 * their own chrome instead.
 */
function StandaloneAuthPage({ logoUrl, logo, children }: StandaloneAuthPageProps): React.ReactElement {
  const authLogoUrl = logoUrl || logo?.src;
  return (
    <StyledStandaloneAuthPage>
      {renderPageLogo(authLogoUrl)}
      {children}
      {authLogoUrl ? <NetlifyCreditIcon size="100px" type="decap" /> : null}
    </StyledStandaloneAuthPage>
  );
}

export { AuthenticationPage as default, LoginButton, renderPageLogo, StandaloneAuthPage, TextButton };
