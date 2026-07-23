import Icon from './Icon';

import type { Meta, StoryObj } from '@storybook/react';
import type { IconName } from './Icon/icons';

const iconNames: IconName[] = [
  'add',
  'add-with',
  'arrow',
  'azure',
  'bitbucket',
  'bold',
  'check',
  'chevron',
  'chevron-double',
  'circle',
  'close',
  'code',
  'code-block',
  'decap',
  'drag-handle',
  'eye',
  'folder',
  'forgejo',
  'gitea',
  'github',
  'gitlab',
  'grid',
  'h-options',
  'h1',
  'h2',
  'home',
  'image',
  'info-circle',
  'italic',
  'link',
  'list',
  'list-bulleted',
  'list-numbered',
  'markdown',
  'media',
  'media-alt',
  'netlify',
  'new-tab',
  'page',
  'pages',
  'pages-alt',
  'quote',
  'refresh',
  'scroll',
  'search',
  'settings',
  'strikethrough',
  'user',
  'workflow',
  'write',
];

const sizes = ['xsmall', 'small', 'medium', 'large'] as const;
const directions = ['up', 'right', 'down', 'left'] as const;

const meta = {
  title: 'UI/Icon',
  component: Icon,
  args: {
    type: 'github',
    size: 'medium',
  },
  argTypes: {
    type: { control: 'select', options: iconNames },
    size: { control: 'radio', options: sizes },
    direction: { control: 'radio', options: directions },
  },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
      {sizes.map(size => (
        <div key={size} style={{ textAlign: 'center' }}>
          <Icon type="github" size={size} />
          <div style={{ fontSize: '12px', marginTop: '8px' }}>{size}</div>
        </div>
      ))}
    </div>
  ),
};

export const Directions: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px' }}>
      {directions.map(direction => (
        <div key={direction} style={{ textAlign: 'center' }}>
          <Icon type="arrow" size="medium" direction={direction} />
          <div style={{ fontSize: '12px', marginTop: '8px' }}>{direction}</div>
        </div>
      ))}
    </div>
  ),
};

export const Gallery: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '16px',
      }}
    >
      {iconNames.map(type => (
        <div
          key={type}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            border: '1px solid #eaebf1',
            borderRadius: '5px',
          }}
        >
          <Icon type={type} size="medium" />
          <code style={{ fontSize: '11px', textAlign: 'center', wordBreak: 'break-all' }}>
            {type}
          </code>
        </div>
      ))}
    </div>
  ),
};
