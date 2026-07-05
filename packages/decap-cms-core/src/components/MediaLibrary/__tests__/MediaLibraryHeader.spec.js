import React from 'react';
import { render } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import { colors } from 'decap-cms-ui-default';

import MediaLibraryHeader from '../MediaLibraryHeader';

expect.extend(matchers);

describe('MediaLibraryHeader', () => {
  const props = {
    onClose: jest.fn(),
    title: 'Media assets',
    t: key => key,
  };

  it('uses the standard text color on the default (non-private) white modal background', () => {
    const { getByText } = render(<MediaLibraryHeader {...props} />);

    expect(getByText('Media assets')).toHaveStyleRule('color', colors.text);
  });

  it('uses the private text color override when isPrivate is true', () => {
    const { getByText } = render(<MediaLibraryHeader {...props} isPrivate />);

    expect(getByText('Media assets')).toHaveStyleRule('color', colors.textFieldBorder);
  });
});
