import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import EditorFieldNavigator, {
  flattenNavigableFields,
} from '@/core/components/Editor/EditorFieldNavigator/EditorFieldNavigator';

import type { CmsEntryField } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const t = ((key: string) => key) as unknown as TranslateFunction;

describe('EditorFieldNavigator', () => {
  it('renders nothing when there are no fields', () => {
    const { container } = render(
      <EditorFieldNavigator fields={[]} onFieldClick={vi.fn()} t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when all fields are hidden widgets', () => {
    const fields = [{ name: 'secret', widget: 'hidden' }] as unknown as CmsEntryField[];
    const { container } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={vi.fn()} t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one entry per top-level visible field, using the label when present', () => {
    const fields = [
      { name: 'title', widget: 'string' },
      { name: 'body', label: 'Body copy', widget: 'markdown' },
      { name: 'internal', widget: 'hidden' },
    ] as unknown as CmsEntryField[];
    const { getByText, queryByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={vi.fn()} t={t} />,
    );

    expect(getByText('title')).toBeInTheDocument();
    expect(getByText('Body copy')).toBeInTheDocument();
    expect(queryByText('internal')).not.toBeInTheDocument();
  });

  it('calls onFieldClick with the top-level field name', () => {
    const fields = [{ name: 'title', widget: 'string' }] as unknown as CmsEntryField[];
    const onFieldClick = vi.fn();
    const { getByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={onFieldClick} t={t} />,
    );

    fireEvent.click(getByText('title'));

    expect(onFieldClick).toHaveBeenCalledWith('title');
  });

  it('recurses into object-widget child fields and builds dotted paths', () => {
    const fields = [
      {
        name: 'seo',
        widget: 'object',
        fields: [
          { name: 'metaTitle', label: 'Meta title', widget: 'string' },
          { name: 'metaDescription', widget: 'string' },
        ],
      },
    ] as unknown as CmsEntryField[];
    const onFieldClick = vi.fn();
    const { getByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={onFieldClick} t={t} />,
    );

    fireEvent.click(getByText('Meta title'));
    expect(onFieldClick).toHaveBeenCalledWith('seo.metaTitle');

    fireEvent.click(getByText('metaDescription'));
    expect(onFieldClick).toHaveBeenCalledWith('seo.metaDescription');
  });

  it('does not recurse into non-object widgets (e.g. list) since instances are runtime-dependent', () => {
    const fields = [
      {
        name: 'items',
        widget: 'list',
        fields: [{ name: 'itemTitle', widget: 'string' }],
      },
    ] as unknown as CmsEntryField[];
    const { getByText, queryByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={vi.fn()} t={t} />,
    );

    expect(getByText('items')).toBeInTheDocument();
    expect(queryByText('itemTitle')).not.toBeInTheDocument();
  });

  it('handles an object widget using the singular `field` key instead of `fields`', () => {
    const fields = [
      {
        name: 'author',
        widget: 'object',
        field: { name: 'name', widget: 'string' },
      },
    ] as unknown as CmsEntryField[];
    const onFieldClick = vi.fn();
    const { getByText } = render(
      <EditorFieldNavigator fields={fields} onFieldClick={onFieldClick} t={t} />,
    );

    fireEvent.click(getByText('name'));
    expect(onFieldClick).toHaveBeenCalledWith('author.name');
  });

  it('marks the item matching activeFieldPath as the current one for a11y + highlight state', () => {
    const fields = [
      { name: 'title', widget: 'string' },
      { name: 'body', widget: 'markdown' },
    ] as unknown as CmsEntryField[];
    const { getByText } = render(
      <EditorFieldNavigator fields={fields} activeFieldPath="body" onFieldClick={vi.fn()} t={t} />,
    );

    expect(getByText('title')).not.toHaveAttribute('aria-current');
    expect(getByText('body')).toHaveAttribute('aria-current', 'true');
  });

  it('updates which item is marked current when activeFieldPath changes (scroll/focus sync)', () => {
    const fields = [
      { name: 'title', widget: 'string' },
      { name: 'body', widget: 'markdown' },
    ] as unknown as CmsEntryField[];
    const { getByText, rerender } = render(
      <EditorFieldNavigator fields={fields} activeFieldPath="title" onFieldClick={vi.fn()} t={t} />,
    );
    expect(getByText('title')).toHaveAttribute('aria-current', 'true');

    rerender(
      <EditorFieldNavigator fields={fields} activeFieldPath="body" onFieldClick={vi.fn()} t={t} />,
    );

    expect(getByText('title')).not.toHaveAttribute('aria-current');
    expect(getByText('body')).toHaveAttribute('aria-current', 'true');
  });
});

describe('flattenNavigableFields', () => {
  it('flattens top-level and nested object fields into dotted-path entries with depth', () => {
    const fields = [
      { name: 'title', widget: 'string' },
      {
        name: 'seo',
        widget: 'object',
        fields: [{ name: 'metaTitle', widget: 'string' }],
      },
      { name: 'hiddenField', widget: 'hidden' },
    ] as unknown as CmsEntryField[];

    expect(flattenNavigableFields(fields)).toEqual([
      { path: 'title', label: 'title', depth: 0 },
      { path: 'seo', label: 'seo', depth: 0 },
      { path: 'seo.metaTitle', label: 'metaTitle', depth: 1 },
    ]);
  });

  it('returns an empty array for undefined fields', () => {
    expect(flattenNavigableFields(undefined)).toEqual([]);
  });
});
