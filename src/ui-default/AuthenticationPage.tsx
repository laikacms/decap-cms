import React from 'react';
import styled from '@emotion/styled';

import Icon from './Icon';
import { buttons, colors, shadows } from './styles';
import GoBackButton from './GoBackButton';

import type { TranslateFunction } from './GoBackButton';

const StyledAuthenticationPage = styled.section`
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: 50px;
  height: 100vh;
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
  logoUrl?: string; // Deprecated, replaced by `logo.src`
  logo?: LogoConfig;
  siteUrl?: string;
  t: TranslateFunction;
}

function AuthenticationPage({
  onLogin,
  loginDisabled,
  loginErrorMessage,
  renderButtonContent,
  renderPageContent,
  logoUrl, // Deprecated, replaced by `logo.src`
  logo,
  siteUrl,
  t,
}: AuthenticationPageProps): React.ReactElement {
  const authLogoUrl = logoUrl || logo?.src;
  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onLogin) {
      e.preventDefault();
      onLogin(e);
    }
  };
  return (
    <StyledAuthenticationPage>
      {renderPageLogo(authLogoUrl)}
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
      {authLogoUrl ? <NetlifyCreditIcon size="100px" type="decap" /> : null}
    </StyledAuthenticationPage>
  );
}

export { AuthenticationPage as default, renderPageLogo, LoginButton, TextButton };
