import React from 'react';
import { render, screen } from '@testing-library/react';
import { fromJS } from 'immutable';

import ObjectPreview from '../ObjectPreview';

// In real usage `PreviewPane.widgetFor` (decap-cms-core) replaces
// `field.get('fields')` / `field.get('field')` with the already-rendered
// nested preview elements before handing the field down to ObjectPreview, so
// these tests model that same shape: React elements stored under
// `fields`/`field` on the Immutable field Map.
function StubPreview({ name }) {
  return <span data-testid={`preview-${name}`}>{name}</span>;
}

describe('ObjectPreview', () => {
  it('renders nested field previews from field.fields (plural)', () => {
    const nestedPreviews = [
      <StubPreview key="title" name="title" />,
      <StubPreview key="author" name="author" />,
    ];
    const field = fromJS({ name: 'object' }).set('fields', nestedPreviews);

    render(<ObjectPreview field={field} />);

    expect(screen.getByTestId('preview-title')).toHaveTextContent('title');
    expect(screen.getByTestId('preview-author')).toHaveTextContent('author');
  });

  it('renders the nested field preview from field.field (singular)', () => {
    const field = fromJS({ name: 'object' }).set('field', <StubPreview name="single" />);

    render(<ObjectPreview field={field} />);

    expect(screen.getByTestId('preview-single')).toHaveTextContent('single');
  });

  it('prefers fields (plural) over field (singular) when both are present', () => {
    const field = fromJS({ name: 'object' })
      .set('fields', [<StubPreview key="a" name="a" />])
      .set('field', <StubPreview name="single" />);

    render(<ObjectPreview field={field} />);

    expect(screen.getByTestId('preview-a')).toBeInTheDocument();
    expect(screen.queryByTestId('preview-single')).not.toBeInTheDocument();
  });

  it('renders an empty preview container when neither field nor fields is configured', () => {
    const field = fromJS({ name: 'object' });
    const { container } = render(<ObjectPreview field={field} />);

    expect(container.textContent).toBe('');
    expect(container.firstChild).not.toBeNull();
  });

  it('converts a plain JS field object to Immutable before reading it', () => {
    // Plain (non-Immutable) `field` objects are converted via `fromJS` before
    // being read, so a plain object without nested React elements should
    // render without throwing (mirrors the `field && !field.get` guard).
    const field = { name: 'object', field: 'plain-js-value' };
    const { container } = render(<ObjectPreview field={field} />);

    expect(container.textContent).toBe('plain-js-value');
  });
});
