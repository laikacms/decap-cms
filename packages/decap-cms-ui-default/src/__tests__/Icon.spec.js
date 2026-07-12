import React from 'react';
import { render } from '@testing-library/react';

import Icon, { getRotation } from '../Icon';

describe('getRotation', () => {
  it("returns '0deg' when no icon direction is configured", () => {
    expect(getRotation(undefined, 'right')).toEqual('0deg');
  });

  it("returns '0deg' when no new direction is requested", () => {
    expect(getRotation('left', undefined)).toEqual('0deg');
  });

  it("returns '0deg' when neither direction is provided", () => {
    expect(getRotation(undefined, undefined)).toEqual('0deg');
  });

  it.each([
    ['right', 'down', '90deg'],
    ['right', 'left', '180deg'],
    ['right', 'up', '270deg'],
    ['down', 'right', '-90deg'],
    ['down', 'left', '90deg'],
    ['down', 'up', '180deg'],
    ['left', 'right', '-180deg'],
    ['left', 'down', '-90deg'],
    ['left', 'up', '90deg'],
    ['up', 'right', '-270deg'],
    ['up', 'down', '-180deg'],
    ['up', 'left', '-90deg'],
  ])('resolves %s -> %s as %s', (iconDirection, newDirection, expected) => {
    expect(getRotation(iconDirection, newDirection)).toEqual(expected);
  });
});

describe('Icon', () => {
  function setup(overrides = {}) {
    const props = {
      type: 'arrow',
      ...overrides,
    };

    const utils = render(<Icon {...props} />);
    return { ...utils, props };
  }

  it("renders the configured icon's SVG", () => {
    const { container } = setup({ type: 'arrow' });

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('maps the xsmall size through the sizes lookup', () => {
    const { container } = setup({ size: 'xsmall' });

    expect(container.firstChild).toHaveStyle({ width: '12px', height: '12px' });
  });

  it('maps the small size through the sizes lookup', () => {
    const { container } = setup({ size: 'small' });

    expect(container.firstChild).toHaveStyle({ width: '18px', height: '18px' });
  });

  it('maps the medium size through the sizes lookup', () => {
    const { container } = setup({ size: 'medium' });

    expect(container.firstChild).toHaveStyle({ width: '24px', height: '24px' });
  });

  it('maps the large size through the sizes lookup', () => {
    const { container } = setup({ size: 'large' });

    expect(container.firstChild).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('defaults to the medium size when no size is given', () => {
    const { container } = setup();

    expect(container.firstChild).toHaveStyle({ width: '24px', height: '24px' });
  });

  it('falls back to a raw string for an unknown size', () => {
    const { container } = setup({ size: '99px' });

    expect(container.firstChild).toHaveStyle({ width: '99px', height: '99px' });
  });

  it('has no rotation when the icon has no configured direction and none is requested', () => {
    const { container } = setup({ type: 'arrow' });

    expect(container.firstChild).toHaveStyle({ transform: 'rotate(0deg)' });
  });

  it('rotates a directional icon toward the requested direction', () => {
    // The 'arrow' icon is configured with a default direction of 'left'.
    const { container } = setup({ type: 'arrow', direction: 'up' });

    expect(container.firstChild).toHaveStyle({ transform: 'rotate(90deg)' });
  });
});
