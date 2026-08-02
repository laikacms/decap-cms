import React from 'react';
import { render, screen } from '@testing-library/react';

import { OfflineIndicator } from '../OfflineIndicator';

function setNavigatorOnLine(value) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

function t(key) {
  return key;
}

describe('OfflineIndicator', () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    setNavigatorOnLine(originalOnLine);
  });

  it('renders nothing while online', () => {
    setNavigatorOnLine(true);
    const { container } = render(<OfflineIndicator t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the offline badge while offline', () => {
    setNavigatorOnLine(false);
    render(<OfflineIndicator t={t} />);
    expect(screen.getByTestId('offline-indicator')).toHaveTextContent('app.header.offline');
  });
});
