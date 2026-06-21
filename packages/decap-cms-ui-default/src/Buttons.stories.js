import React from 'react';

import { buttons } from './styles';

const variants = [
  { label: 'Default', styles: [buttons.button, buttons.default] },
  { label: 'Gray', styles: [buttons.button, buttons.default, buttons.gray] },
  { label: 'Green', styles: [buttons.button, buttons.default, buttons.green] },
  { label: 'Teal', styles: [buttons.button, buttons.default, buttons.teal] },
  { label: 'Light blue', styles: [buttons.button, buttons.default, buttons.lightBlue] },
  { label: 'Light red', styles: [buttons.button, buttons.default, buttons.lightRed] },
  { label: 'Light teal', styles: [buttons.button, buttons.default, buttons.lightTeal] },
  { label: 'Gray text', styles: [buttons.button, buttons.default, buttons.grayText] },
  { label: 'Disabled', styles: [buttons.button, buttons.default, buttons.disabled] },
];

function ButtonVariants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      {variants.map(variant => (
        <button key={variant.label} css={variant.styles}>
          {variant.label}
        </button>
      ))}
    </div>
  );
}

function ButtonSizes() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
      <button css={[buttons.button, buttons.widget, buttons.lightBlue]}>Widget</button>
      <button css={[buttons.button, buttons.default, buttons.medium, buttons.gray]}>Medium</button>
      <button css={[buttons.button, buttons.default, buttons.small, buttons.gray]}>Small</button>
    </div>
  );
}

export default {
  title: 'Design System/Buttons',
};

export const Variants = {
  render: ButtonVariants,
};

export const Sizes = {
  render: ButtonSizes,
};
