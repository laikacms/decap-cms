import styled from '@emotion/styled';
import React from 'react';

import { LoginButton } from './AuthenticationPage';
import { borders, colors, lengths } from './styles';

import type { TranslateFunction } from './GoBackButton';

/**
 * `PatLoginForm` is the personal-access-token alternative to the OAuth
 * button every git backend's `AuthenticationPage.tsx` already renders
 * (DCMS-1400). It's content-only, shared across backends via
 * `renderPageContent`, and never replaces the OAuth path — both are offered
 * side by side when the backend config opts in (`backend.pat_auth: true`).
 */
const StyledForm = styled.form`
  display: flex;
  flex-flow: column nowrap;
  align-items: stretch;
  gap: 10px;
  width: 100%;
`;

const TokenInput = styled.input`
  border: ${borders.textField};
  border-radius: ${lengths.borderRadius};
  background-color: ${colors.inputBackground};
  color: ${colors.text};
  padding: 10px 12px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${colors.textFieldBorder};
  width: 100%;
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: ${colors.textFieldBorder};
  }
`;

export interface PatLoginFormProps {
  onSubmit: (token: string) => void;
  disabled?: boolean | undefined;
  t: TranslateFunction;
  /** Placeholder text override, e.g. "ghp_..." or a provider-specific hint. */
  placeholder?: string | undefined;
  showDivider?: boolean | undefined;
}

function PatLoginForm({
  onSubmit,
  disabled,
  t,
  placeholder,
  showDivider = true,
}: PatLoginFormProps): React.ReactElement {
  const [token, setToken] = React.useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <React.Fragment>
      <StyledForm onSubmit={handleSubmit}>
        <label htmlFor="pat-token-input">{t('auth.loginWithPersonalAccessToken')}</label>
        <TokenInput
          id="pat-token-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder ?? t('auth.personalAccessTokenPlaceholder')}
          value={token}
          onChange={e => setToken(e.target.value)}
        />
        <LoginButton type="submit" disabled={disabled || !token.trim()}>
          {disabled ? t('auth.loggingIn') : t('auth.loginWithToken')}
        </LoginButton>
      </StyledForm>
      {showDivider ? <Divider>{t('auth.orDivider')}</Divider> : null}
    </React.Fragment>
  );
}

export { PatLoginForm as default };
