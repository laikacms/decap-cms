import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { fromJS } from 'immutable';

import EditorFieldNavigator from '../EditorFieldNavigator';

function t(key) {
  return key;
}

describe('EditorFieldNavigator', () => {
  it('renders nothing when there are no visible fields', () => {
    const { container } = render(
      <EditorFieldNavigator fields={fromJS([])} onFieldClick={jest.fn()} t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a nothing when all fields are hidden widgets', () => {
    const fields = fromJS([{ name: 'secret', widget: 'hidden' }]);
    const { container } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={jest.fn()} t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one entry per top-level visible field, using the label when present', () => {
    const fields = fromJS([
      { name: 'title', widget: 'string' },
      { name: 'body', label: 'Body copy', widget: 'markdown' },
      { name: 'internal', widget: 'hidden' },
    ]);
    const { getByText, queryByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={jest.fn()} t={t} />,
    );

    expect(getByText('title')).toBeInTheDocument();
    expect(getByText('Body copy')).toBeInTheDocument();
    expect(queryByText('internal')).not.toBeInTheDocument();
  });

  it('calls onFieldClick with the top-level field name', () => {
    const fields = fromJS([{ name: 'title', widget: 'string' }]);
    const onFieldClick = jest.fn();
    const { getByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={onFieldClick} t={t} />,
    );

    fireEvent.click(getByText('title'));

    expect(onFieldClick).toHaveBeenCalledWith('title');
  });

  it('recurses into object-widget child fields and builds dotted paths', () => {
    const fields = fromJS([
      {
        name: 'seo',
        widget: 'object',
        fields: [
          { name: 'metaTitle', label: 'Meta title', widget: 'string' },
          { name: 'metaDescription', widget: 'string' },
        ],
      },
    ]);
    const onFieldClick = jest.fn();
    const { getByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={onFieldClick} t={t} />,
    );

    fireEvent.click(getByText('Meta title'));
    expect(onFieldClick).toHaveBeenCalledWith('seo.metaTitle');

    fireEvent.click(getByText('metaDescription'));
    expect(onFieldClick).toHaveBeenCalledWith('seo.metaDescription');
  });

  it('does not recurse into non-object widgets (e.g. list) since instances are runtime-dependent', () => {
    const fields = fromJS([
      {
        name: 'items',
        widget: 'list',
        fields: [{ name: 'itemTitle', widget: 'string' }],
      },
    ]);
    const { getByText, queryByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={jest.fn()} t={t} />,
    );

    expect(getByText('items')).toBeInTheDocument();
    expect(queryByText('itemTitle')).not.toBeInTheDocument();
  });

  it('handles an object widget using the singular `field` key instead of `fields`', () => {
    const fields = fromJS([
      {
        name: 'author',
        widget: 'object',
        field: { name: 'name', widget: 'string' },
      },
    ]);
    const onFieldClick = jest.fn();
    const { getByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={onFieldClick} t={t} />,
    );

    fireEvent.click(getByText('name'));
    expect(onFieldClick).toHaveBeenCalledWith('author.name');
  });
});
