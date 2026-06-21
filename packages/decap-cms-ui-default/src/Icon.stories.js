import React from 'react';

import Icon from './Icon';

const iconNames = [
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
  'drag-handle',
  'eye',
  'folder',
  'github',
  'gitlab',
  'gitea',
  'grid',
  'h1',
  'h2',
  'hOptions',
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
  'decap',
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

const sizes = ['xsmall', 'small', 'medium', 'large'];
const directions = ['up', 'right', 'down', 'left'];

function IconSizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
      {sizes.map(size => (
        <div key={size} style={{ textAlign: 'center' }}>
          <Icon type="github" size={size} />
          <div style={{ fontSize: '12px', marginTop: '8px' }}>{size}</div>
        </div>
      ))}
    </div>
  );
}

function IconDirections() {
  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {directions.map(direction => (
        <div key={direction} style={{ textAlign: 'center' }}>
          <Icon type="arrow" size="medium" direction={direction} />
          <div style={{ fontSize: '12px', marginTop: '8px' }}>{direction}</div>
        </div>
      ))}
    </div>
  );
}

function IconGallery() {
  return (
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
  );
}

export default {
  title: 'UI/Icon',
  component: Icon,
  args: {
    type: 'github',
    size: 'medium',
  },
  argTypes: {
    type: {
      control: 'select',
      options: iconNames,
    },
    size: {
      control: 'radio',
      options: sizes,
    },
    direction: {
      control: 'radio',
      options: directions,
    },
  },
};

export const Default = {};

export const Sizes = {
  render: IconSizes,
};

export const Directions = {
  render: IconDirections,
};

export const Gallery = {
  render: IconGallery,
};
