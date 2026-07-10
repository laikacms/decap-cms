import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { buttons } from './styles';

import type { SerializedStyles } from '@emotion/react';
import type { Meta, StoryObj } from '@storybook/react';

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`;

const Button = styled.button<{ sx: SerializedStyles }>`
  ${props => props.sx};
`;

const variants: { label: string; sx: SerializedStyles }[] = [
  { label: 'Default', sx: css(buttons.button, buttons.default) },
  { label: 'Gray', sx: css(buttons.button, buttons.default, buttons.gray) },
  { label: 'Green', sx: css(buttons.button, buttons.default, buttons.green) },
  { label: 'Teal', sx: css(buttons.button, buttons.default, buttons.teal) },
  { label: 'Light blue', sx: css(buttons.button, buttons.default, buttons.lightBlue) },
  { label: 'Light red', sx: css(buttons.button, buttons.default, buttons.lightRed) },
  { label: 'Light teal', sx: css(buttons.button, buttons.default, buttons.lightTeal) },
  { label: 'Gray text', sx: css(buttons.button, buttons.default, buttons.grayText) },
  { label: 'Disabled', sx: css(buttons.button, buttons.default, buttons.disabled) },
];

const sizesShowcase: { label: string; sx: SerializedStyles }[] = [
  { label: 'Widget', sx: css(buttons.button, buttons.widget, buttons.lightBlue) },
  { label: 'Medium', sx: css(buttons.button, buttons.default, buttons.medium, buttons.gray) },
  { label: 'Small', sx: css(buttons.button, buttons.default, buttons.small, buttons.gray) },
];

const meta = {
  title: 'Design System/Buttons',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Row>
      {variants.map(variant => (
        <Button key={variant.label} sx={variant.sx}>
          {variant.label}
        </Button>
      ))}
    </Row>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Row>
      {sizesShowcase.map(variant => (
        <Button key={variant.label} sx={variant.sx}>
          {variant.label}
        </Button>
      ))}
    </Row>
  ),
};
