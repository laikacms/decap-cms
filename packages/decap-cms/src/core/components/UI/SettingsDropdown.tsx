import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { translate } from '@/core/i18n';
import { stripProtocol } from '@/core/lib/urlHelper';
import { colors, Dropdown, DropdownButton, DropdownItem, Icon } from '@/ui/default/index';

import type { TranslateFunction } from '@/ui/default/index';

const styles = {
  avatarImage: css`
    width: 32px;
    border-radius: 32px;
  `,
};

const AvatarDropdownButton = styled(DropdownButton)`
  display: inline-block;
  padding: 8px;
  cursor: pointer;
  color: #1e2532;
  background-color: transparent;
  /* Round like the avatar it contains, so keyboard-focus outlines (which
     follow border-radius) draw a circle instead of a square box. */
  border-radius: 9999px;
`;

const AvatarImage = styled.img`
  ${styles.avatarImage};
`;

const AvatarPlaceholderIcon = styled(Icon)`
  ${styles.avatarImage};
  height: 32px;
  color: #1e2532;
  background-color: ${colors.textFieldBorder};
`;

// Truncated with an ellipsis rather than left to overflow (DCMS-1049, ported
// from upstream 64118e404) — the header collapses these links entirely below
// AppHeader's MOBILE_BREAKPOINT, but a long `display_url` or repo name can
// still overflow the header at wider widths where they stay visible.
const headerLinkTruncation = css`
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
`;

const AppHeaderSiteLink = styled.a`
  font-size: 14px;
  font-weight: 400;
  color: ${colors.controlLabel};
  padding: 10px 16px;
  ${headerLinkTruncation};
`;

const AppHeaderTestRepoIndicator = styled.a`
  font-size: 14px;
  font-weight: 400;
  color: ${colors.controlLabel};
  padding: 10px 16px;
  ${headerLinkTruncation};
`;

interface AvatarProps {
  imageUrl?: string;
}

function Avatar({ imageUrl }: AvatarProps) {
  return imageUrl ? <AvatarImage src={imageUrl} /> : <AvatarPlaceholderIcon type="user" size="large" />;
}

interface SettingsDropdownProps {
  displayUrl?: string;
  isTestRepo?: boolean;
  imageUrl?: string;
  onLogoutClick: () => void;
  t: TranslateFunction;
}

function SettingsDropdown({
  displayUrl,
  isTestRepo,
  imageUrl,
  onLogoutClick,
  t,
}: SettingsDropdownProps) {
  return (
    <React.Fragment>
      {isTestRepo && (
        <AppHeaderTestRepoIndicator
          href="https://www.decapcms.org/docs/test-backend"
          target="_blank"
          rel="noopener noreferrer"
        >
          Test Backend ↗
        </AppHeaderTestRepoIndicator>
      )}
      {displayUrl
        ? (
          <AppHeaderSiteLink href={displayUrl} target="_blank" rel="noopener noreferrer">
            {stripProtocol(displayUrl)}
          </AppHeaderSiteLink>
        )
        : null}
      <Dropdown
        dropdownTopOverlap="50px"
        dropdownWidth="100px"
        dropdownPosition="right"
        renderButton={() => (
          <AvatarDropdownButton aria-label={t('ui.settingsDropdown.account')}>
            <Avatar imageUrl={imageUrl} />
          </AvatarDropdownButton>
        )}
      >
        <DropdownItem label={t('ui.settingsDropdown.logOut')} onClick={onLogoutClick} />
      </Dropdown>
    </React.Fragment>
  );
}

export default translate()(SettingsDropdown);
