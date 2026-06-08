import React from 'react';

import LaikaBadge from './LaikaBadge';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaBadge> = {
  title: 'Primitives/LaikaBadge',
  component: LaikaBadge,
  argTypes: {
    intent: {
      control: 'select',
      options: ['neutral', 'info', 'success', 'warning', 'danger', 'draft'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof LaikaBadge>;

export const Neutral: Story = { args: { intent: 'neutral', children: 'Neutral' } };
export const Info: Story = { args: { intent: 'info', children: '12 files' } };
export const Success: Story = { args: { intent: 'success', children: 'Ready' } };
export const Warning: Story = { args: { intent: 'warning', children: 'In review' } };
export const Danger: Story = { args: { intent: 'danger', children: 'Error' } };
export const Draft: Story = { args: { intent: 'draft', children: 'Draft' } };

export const AllIntents: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <LaikaBadge intent="neutral">Neutral</LaikaBadge>
      <LaikaBadge intent="info">Info</LaikaBadge>
      <LaikaBadge intent="success">Success</LaikaBadge>
      <LaikaBadge intent="warning">Warning</LaikaBadge>
      <LaikaBadge intent="danger">Danger</LaikaBadge>
      <LaikaBadge intent="draft">Draft</LaikaBadge>
    </div>
  ),
};
