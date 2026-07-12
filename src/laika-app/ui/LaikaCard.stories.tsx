import React from 'react';

import LaikaCard from './LaikaCard';
import LaikaButton from './LaikaButton';
import LaikaBadge from './LaikaBadge';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaCard> = {
  title: 'Primitives/LaikaCard',
  component: LaikaCard,
  argTypes: {
    interactive: { control: 'boolean' },
    padding: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<typeof LaikaCard>;

export const Basic: Story = {
  render: args => (
    <LaikaCard {...args} style={{ width: 320 }}>
      <LaikaCard.Header>
        <LaikaCard.Title>Posts</LaikaCard.Title>
        <LaikaBadge intent="info">12</LaikaBadge>
      </LaikaCard.Header>
      <LaikaCard.Body>Blog posts and articles, written in markdown.</LaikaCard.Body>
      <LaikaCard.Footer>
        <LaikaButton variant="secondary" fullWidth>
          Browse
        </LaikaButton>
        <LaikaButton>New Post</LaikaButton>
      </LaikaCard.Footer>
    </LaikaCard>
  ),
};

export const StaticPanel: Story = {
  render: () => (
    <LaikaCard interactive={false} style={{ width: 320 }}>
      <LaikaCard.Body>A static panel - no hover elevation.</LaikaCard.Body>
    </LaikaCard>
  ),
};
