import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

// Stub the core controls with markers so the test focuses on the laika
// surface (view-style toggles + container) and doesn't have to exercise
// each dropdown's full keyboard/click behavior.
vi.mock('../../core/components/Collection/SortControl', () => ({
  default: () => <div data-testid="core-sort" />,
}));
vi.mock('../../core/components/Collection/FilterControl', () => ({
  default: () => <div data-testid="core-filter" />,
}));
vi.mock('../../core/components/Collection/GroupControl', () => ({
  default: () => <div data-testid="core-group" />,
}));

import LaikaCollectionControls from '@/laika-app/LaikaCollectionControls';

const baseProps = {
  viewStyle: 'VIEW_STYLE_LIST',
  onChangeViewStyle: vi.fn(),
  sortableFields: [{ key: 'title', label: 'Title' }],
  onSortClick: vi.fn(),
  sort: {},
  viewFilters: [],
  viewGroups: [],
  onFilterClick: vi.fn(),
  onGroupClick: vi.fn(),
  filter: undefined,
  group: undefined,
};

describe('LaikaCollectionControls', () => {
  it('renders view-style toggles (list + grid)', () => {
    const { getByLabelText } = render(<LaikaCollectionControls {...baseProps} />);
    expect(getByLabelText('collection.collectionTop.viewAsList')).toBeInTheDocument();
    expect(getByLabelText('collection.collectionTop.viewAsGrid')).toBeInTheDocument();
  });

  it('fires onChangeViewStyle when grid toggle is clicked', () => {
    const onChangeViewStyle = vi.fn();
    const { getByLabelText } = render(
      <LaikaCollectionControls {...baseProps} onChangeViewStyle={onChangeViewStyle} />,
    );
    fireEvent.click(getByLabelText('collection.collectionTop.viewAsGrid'));
    expect(onChangeViewStyle).toHaveBeenCalledWith('VIEW_STYLE_GRID');
  });

  it('renders SortControl when sortableFields is non-empty', () => {
    const { getByTestId } = render(<LaikaCollectionControls {...baseProps} />);
    expect(getByTestId('core-sort')).toBeInTheDocument();
  });

  it('renders FilterControl + GroupControl when their inputs are present', () => {
    const { getByTestId } = render(
      <LaikaCollectionControls
        {...baseProps}
        viewFilters={[{ id: 'f1', label: 'F', field: 'x', pattern: 'x' } as any]}
        filter={{}}
        viewGroups={[{ id: 'g1', label: 'G', field: 'x' } as any]}
        group={{}}
      />,
    );
    expect(getByTestId('core-filter')).toBeInTheDocument();
    expect(getByTestId('core-group')).toBeInTheDocument();
  });

  it('omits SortControl when sortableFields is empty', () => {
    const { queryByTestId } = render(
      <LaikaCollectionControls {...baseProps} sortableFields={[]} />,
    );
    expect(queryByTestId('core-sort')).toBeNull();
  });
});
