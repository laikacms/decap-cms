import React from 'react';
import { render, screen } from '@testing-library/react';

import withProps from '../withProps';

describe('withProps', () => {
  function BaseComponent({ as: Tag = 'div', ref, ...rest }) {
    return <Tag data-testid="base" ref={ref} {...rest} />;
  }

  it('applies the given defaultProps to the wrapped component', () => {
    const Wrapped = withProps(BaseComponent, { as: 'span', 'data-variant': 'default' });

    render(<Wrapped />);

    const node = screen.getByTestId('base');
    expect(node.tagName).toBe('SPAN');
    expect(node.getAttribute('data-variant')).toBe('default');
  });

  it('lets props passed at render time override defaultProps', () => {
    const Wrapped = withProps(BaseComponent, { as: 'span', 'data-variant': 'default' });

    render(<Wrapped as="b" data-variant="override" />);

    const node = screen.getByTestId('base');
    expect(node.tagName).toBe('B');
    expect(node.getAttribute('data-variant')).toBe('override');
  });

  it('forwards a ref through to the wrapped component', () => {
    const Wrapped = withProps(BaseComponent, { as: 'span' });
    const ref = React.createRef();

    render(<Wrapped ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('merges non-conflicting props from both defaultProps and passed props', () => {
    const Wrapped = withProps(BaseComponent, { as: 'span', 'data-variant': 'default' });

    render(<Wrapped className="extra" />);

    const node = screen.getByTestId('base');
    expect(node.className).toBe('extra');
    expect(node.getAttribute('data-variant')).toBe('default');
  });
});
