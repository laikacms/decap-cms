import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FieldActionBar } from '@/core/components/Editor/EditorControlPane/EditorControl';
import { getFieldActions, registerFieldAction } from '@/core/lib/registry';

import type { CmsCollectionState, CmsEntryField, CmsFieldAction } from '@/lib/util/index';

const editorApiMock = vi.hoisted(() => ({
  getCurrentEntry: vi.fn(() => ({ collection: 'posts', slug: 'hello' })),
  applyFieldPatch: vi.fn(),
  onEditorChange: vi.fn(),
}));
vi.mock('@/core/lib/editorApi', () => ({ editorApi: editorApiMock }));

const field = { name: 'title', label: 'Title', widget: 'string' } as unknown as CmsEntryField;
const collection = { name: 'posts' } as unknown as CmsCollectionState;

afterEach(() => {
  vi.clearAllMocks();
});

describe('FieldActionBar (CMS.registerFieldAction)', () => {
  it('renders available actions and calls them with plain values', () => {
    const onClick = vi.fn();
    const actions: CmsFieldAction[] = [
      { id: 'a', label: 'Ask', title: 'Ask someone', onClick },
      { id: 'b', label: 'Hidden', isAvailable: () => false, onClick: vi.fn() },
    ];

    render(<FieldActionBar field={field} collection={collection} locale="en" actions={actions} />);

    expect(screen.queryByRole('button', { name: 'Hidden' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    const context = onClick.mock.calls[0][0];
    expect(context.field).toEqual({ name: 'title', label: 'Title', widget: 'string' });
    expect(context.collection).toBe('posts');
    expect(context.locale).toBe('en');
    expect(context.applyFieldPatch).toBe(editorApiMock.applyFieldPatch);
  });

  it('reads the entry only when an action asks for it', () => {
    const onClick = vi.fn(context => context.entry);
    render(
      <FieldActionBar
        field={field}
        collection={collection}
        locale={undefined}
        actions={[{ id: 'a', label: 'A', onClick }]}
      />,
    );

    expect(editorApiMock.getCurrentEntry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(editorApiMock.getCurrentEntry).toHaveBeenCalledTimes(1);
    expect(onClick.mock.results[0].value).toEqual({ collection: 'posts', slug: 'hello' });
  });

  it('renders nothing when no action is available', () => {
    const { container } = render(
      <FieldActionBar
        field={field}
        collection={collection}
        locale="en"
        actions={[{ id: 'a', label: 'A', isAvailable: () => false, onClick: vi.fn() }]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('registerFieldAction', () => {
  it('validates, replaces by id and keeps the array stable between registrations', () => {
    expect(() => registerFieldAction({ id: 'x' } as never)).toThrow(/id and a label/);
    expect(() => registerFieldAction({ id: 'x', label: 'X' } as never)).toThrow(/onClick/);

    registerFieldAction({ id: 'test-replace', label: 'One', onClick: vi.fn() });
    const before = getFieldActions();
    expect(getFieldActions()).toBe(before);
    registerFieldAction({ id: 'test-replace', label: 'Two', onClick: vi.fn() });

    const matching = getFieldActions().filter(action => action.id === 'test-replace');
    expect(matching.map(action => action.label)).toEqual(['Two']);
    expect(getFieldActions()).not.toBe(before);
  });
});
