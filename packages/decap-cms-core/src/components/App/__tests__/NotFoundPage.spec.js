import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

import { NotFoundPage } from '../NotFoundPage';

function t(key, options) {
  const strings = {
    'app.notFoundPage.header': 'Not Found',
    'app.notFoundPage.collectionNotFoundHeader': 'Collection "%{name}" not found',
    'app.notFoundPage.backToHome': 'Back to home',
  };
  const template = strings[key] || key;
  return options ? template.replace('%{name}', options.name) : template;
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

  // DCMS-503: echo the unknown collection name so the user can tell the URL
  // itself was wrong, instead of a generic "Not Found" header.
  it('echoes the collection name in the header when collectionName is provided', () => {
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <NotFoundPage t={t} collectionName="BOGUS-COLL" />
      </MemoryRouter>,
    );

    expect(getByText('Collection "BOGUS-COLL" not found')).toBeInTheDocument();
    expect(queryByText('Not Found')).not.toBeInTheDocument();
  });
});
