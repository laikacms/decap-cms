import React from 'react';
import { render } from '@testing-library/react';

jest.mock('react-polyglot', () => ({
  translate: () => Component => Component,
}));

import SettingsDropdown from '../SettingsDropdown';

describe('SettingsDropdown', () => {
  it('renders the display URL link text with the protocol included', () => {
    const displayUrl = 'https://your-site.com';
    const { getByText } = render(
      <SettingsDropdown displayUrl={displayUrl} onLogoutClick={jest.fn()} t={key => key} />,
    );

    const link = getByText(displayUrl);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', displayUrl);
  });

  it('does not render a display URL link when displayUrl is not provided', () => {
    const { queryByText } = render(<SettingsDropdown onLogoutClick={jest.fn()} t={key => key} />);

    expect(queryByText(/your-site\.com/)).not.toBeInTheDocument();
  });
});
