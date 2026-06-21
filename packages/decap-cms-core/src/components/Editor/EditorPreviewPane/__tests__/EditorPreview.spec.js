import React from 'react';
import { render } from '@testing-library/react';
import { fromJS } from 'immutable';

import EditorPreview from '../EditorPreview';

jest.mock('@emotion/styled', () => {
  // eslint-disable-next-line react/display-name, func-style
  const mockStyled = tag => props => require('react').createElement(tag, props);
  mockStyled.div = mockStyled('div');
  return mockStyled;
});

describe('EditorPreview', () => {
  const collection = fromJS({ name: 'posts' });
  const entry = fromJS({ data: {} });
  const getAsset = jest.fn();

  it('renders visible fields', () => {
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

    expect(getByTestId('widget-title')).toBeTruthy();
    expect(widgetFor).toHaveBeenCalledWith('title');
  });

  it('does not render hidden widget fields (DCMS-108)', () => {
    const fields = fromJS([
      { name: 'title', widget: 'string' },
      { name: 'secret', widget: 'hidden' },
    ]);
    const widgetFor = jest.fn(name => <span data-testid={`widget-${name}`}>{name}</span>);

    const { getByTestId, queryByTestId } = render(
      <EditorPreview
        collection={collection}
        entry={entry}
        fields={fields}
        getAsset={getAsset}
        widgetFor={widgetFor}
      />,
    );

    expect(getByTestId('widget-title')).toBeTruthy();
    expect(queryByTestId('widget-secret')).toBeNull();
    expect(widgetFor).not.toHaveBeenCalledWith('secret');
  });

  it('renders nothing when fields is missing', () => {
    const { container } = render(
      <EditorPreview
        collection={collection}
        entry={entry}
        fields={null}
        getAsset={getAsset}
        widgetFor={jest.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
