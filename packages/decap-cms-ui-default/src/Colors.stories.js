import React from 'react';

import { colors, colorsRaw } from './styles';

function renderSwatches(palette) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
      }}
    >
      {Object.entries(palette).map(([name, value]) => (
        <div
          key={name}
          style={{
            border: '1px solid #eaebf1',
            borderRadius: '5px',
            overflow: 'hidden',
          }}
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

function RawColors() {
  return renderSwatches(colorsRaw);
}

function SemanticColors() {
  return renderSwatches(colors);
}

export default {
  title: 'Design System/Colors',
};

export const Raw = {
  render: RawColors,
};

export const Semantic = {
  render: SemanticColors,
};
