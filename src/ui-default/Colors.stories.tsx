import { colorsDefaults, colorsRawDefaults } from './styles';

import type { Meta, StoryObj } from '@storybook/react';

function Swatches({ entries }: { entries: [string, string][] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
      }}
    >
      {entries.map(([name, value]) => (
        <div
          key={name}
          style={{ border: '1px solid #eaebf1', borderRadius: '5px', overflow: 'hidden' }}
        >
          <div style={{ background: value, height: '64px' }} />
          <div style={{ padding: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{name}</div>
            <code style={{ fontSize: '12px', color: '#798291' }}>{value}</code>
          </div>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: 'Design System/Colors',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Raw: Story = {
  render: () => <Swatches entries={Object.entries(colorsRawDefaults)} />,
};

export const Semantic: Story = {
  render: () => <Swatches entries={Object.entries(colorsDefaults)} />,
};
