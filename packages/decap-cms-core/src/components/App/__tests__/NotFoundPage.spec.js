import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

import { NotFoundPage } from '../NotFoundPage';

function t(key) {
  return (
    {
      'app.notFoundPage.header': 'Not Found',
      'app.notFoundPage.backToHome': 'Back to home',
    }[key] || key
  );
}

describe('NotFoundPage', () => {
  it('renders a default Back to home link when no backLink is provided', () => {
    const { getByText } = render(
      <MemoryRouter>
        <NotFoundPage t={t} />
      </MemoryRouter>,
    );

    expect(getByText('Not Found')).toBeInTheDocument();
    const link = getByText('Back to home');
    expect(link.getAttribute('href')).toEqual('/');
  });

  it('renders the given backLink instead of the default when provided', () => {
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <NotFoundPage t={t} backLink={<a href="/collections/posts">Back to Posts</a>} />
      </MemoryRouter>,
    );

    expect(getByText('Not Found')).toBeInTheDocument();
    expect(getByText('Back to Posts')).toBeInTheDocument();
    expect(queryByText('Back to home')).not.toBeInTheDocument();
  });
});
