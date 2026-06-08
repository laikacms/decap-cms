import AuthenticationPage from './AuthenticationPage';
import Icon from './Icon';

import type { TranslateFunction } from './GoBackButton';
import type { Meta, StoryObj } from '@storybook/react';

const t: TranslateFunction = key => (key === 'ui.default.goBackToSite' ? 'Go back to site' : key);

function LoginButtonContent() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <Icon type="github" size="small" />
      Login with GitHub
    </span>
  );
}

const meta = {
  title: 'UI/AuthenticationPage',
  component: AuthenticationPage,
  parameters: { layout: 'fullscreen' },
  args: {
    t,
    onLogin: () => {},
    renderButtonContent: () => <LoginButtonContent />,
  },
} satisfies Meta<typeof AuthenticationPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithGoBackButton: Story = {
  args: {
    siteUrl: 'https://example.com',
  },
};

export const WithErrorMessage: Story = {
  args: {
    loginErrorMessage: 'Unable to authenticate, please try again.',
  },
};
