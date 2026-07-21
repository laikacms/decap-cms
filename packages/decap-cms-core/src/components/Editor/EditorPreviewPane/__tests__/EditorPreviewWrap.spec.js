import React from 'react';
import { render } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import { fromJS } from 'immutable';

import EditorPreview from '../EditorPreview';

expect.extend(matchers);

// DCMS-1289: a long unbroken string (API token, hex digest) rendered by a
// widget preview has no natural break point. Without `overflow-wrap` /
// `word-break` on the container, it overflows the preview pane instead of
// wrapping. Mirrors the fix landed on v4.beta in PR #982, adapted to main's
// EditorPreview/PreviewContainer layout.
describe('EditorPreview PreviewContainer wrap CSS (DCMS-1289)', () => {
  const collection = fromJS({ name: 'posts' });
  const entry = fromJS({ data: {} });
  const getAsset = jest.fn();

  it('wraps long unbroken content instead of letting it overflow', () => {
    const fields = fromJS([{ name: 'title', widget: 'string' }]);
    const widgetFor = jest.fn(name => <span data-testid={`widget-${name}`}>{name}</span>);

    const { getByTestId } = render(
      <EditorPreview
        collection={collection}
        entry={entry}
        fields={fields}
        getAsset={getAsset}
        widgetFor={widgetFor}
      />,
    );

    const container = getByTestId('widget-title').closest('div').parentElement;

    expect(container).toHaveStyleRule('overflow-wrap', 'anywhere');
    expect(container).toHaveStyleRule('word-break', 'break-word');
    expect(container).toHaveStyleRule('max-width', '100%');
  });
});
