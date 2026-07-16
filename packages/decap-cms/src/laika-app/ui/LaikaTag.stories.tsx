import React, { useState } from 'react';

import LaikaTag from './LaikaTag';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaTag> = {
  title: 'Primitives/LaikaTag',
  component: LaikaTag,
};
export default meta;
type Story = StoryObj<typeof LaikaTag>;

export const Static: Story = { args: { children: 'production' } };

export const Removable: Story = {
  render: () => {
    const [tags, setTags] = useState(['hugo', 'jamstack', 'static-site']);
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tags.map(t => (
          <LaikaTag key={t} onRemove={() => setTags(prev => prev.filter(p => p !== t))}>
            {t}
          </LaikaTag>
        ))}
        {tags.length === 0 && <em style={{ opacity: 0.6 }}>(all removed - refresh to reset)</em>}
      </div>
    );
  },
};
