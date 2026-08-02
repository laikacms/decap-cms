import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import PreviewContent from '../EditorPreviewContent';

// DCMS-1687: PR #1684 migrated collection off the Immutable API everywhere
// except this component, which kept calling `collection.getIn(...)`. A
// plain JS `collection` object has no `.getIn` method, so the optional
// chain (`previewProps?.collection?.getIn`) does not short-circuit — it
// resolves to the function itself and throws when invoked. Mounting with a
// plain-JS collection (and with collection missing entirely) must not throw.
function NoopPreview() {
  return <div data-testid="preview-body">preview</div>;
}

describe('PreviewContent (DCMS-1687)', () => {
  it('does not throw when collection is a plain JS object', () => {
    const previewProps = {
      collection: { name: 'posts', editor: { visualEditing: false } },
    };

    expect(() =>
      render(<PreviewContent previewComponent={NoopPreview} previewProps={previewProps} />),
    ).not.toThrow();
  });

  it('does not throw on click when collection is a plain JS object with visualEditing enabled', () => {
    const previewProps = {
      collection: { name: 'posts', editor: { visualEditing: true } },
    };

    const { getByTestId } = render(
      <PreviewContent previewComponent={NoopPreview} previewProps={previewProps} />,
    );

    expect(() => fireEvent.click(getByTestId('preview-body'))).not.toThrow();
  });

  it('does not throw when collection is undefined', () => {
    const previewProps = {};

    expect(() =>
      render(<PreviewContent previewComponent={NoopPreview} previewProps={previewProps} />),
    ).not.toThrow();
  });

  it('does not throw when previewProps is undefined', () => {
    expect(() => render(<PreviewContent previewComponent={NoopPreview} />)).not.toThrow();
  });
});
