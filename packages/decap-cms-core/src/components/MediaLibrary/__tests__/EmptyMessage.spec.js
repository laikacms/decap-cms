import React from 'react';
import { render } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import { colors } from 'decap-cms-ui-default';

import EmptyMessage from '../EmptyMessage';

expect.extend(matchers);

describe('EmptyMessage', () => {
  it('uses the standard text color on the default (non-private) white modal background', () => {
    const { getByText } = render(<EmptyMessage content="No assets found." />);
    const container = getByText('No assets found.').parentElement;

    expect(container).toHaveStyleRule('color', colors.text);
  });

  it('uses the private text color override when isPrivate is true', () => {
    const { getByText } = render(<EmptyMessage content="No assets found." isPrivate />);
    const container = getByText('No assets found.').parentElement;

    expect(container).toHaveStyleRule('color', colors.textFieldBorder);
  });
});
