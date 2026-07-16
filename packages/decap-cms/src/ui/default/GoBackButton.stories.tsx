import GoBackButton from './GoBackButton';

import type { Meta, StoryObj } from '@storybook/react';
import type { TranslateFunction } from './GoBackButton';

const t: TranslateFunction = key => (key === 'ui.default.goBackToSite' ? 'Go back to site' : key);

const meta = {
  title: 'UI/GoBackButton',
  component: GoBackButton,
  args: {
    href: 'https://example.com',
    t,
  },
} satisfies Meta<typeof GoBackButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
