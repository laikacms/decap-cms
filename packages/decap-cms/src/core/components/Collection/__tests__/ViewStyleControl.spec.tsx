import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import ViewStyleControl from '@/core/components/Collection/ViewStyleControl';
import { VIEW_STYLE_GRID, VIEW_STYLE_LIST } from '@/core/constants/collectionViews';

describe('ViewStyleControl', () => {
  const t = (key: string) => key;

  function renderControl(viewStyle: string, onChangeViewStyle = vi.fn()) {
    const utils = render(
      <ViewStyleControl viewStyle={viewStyle} onChangeViewStyle={onChangeViewStyle} t={t} />,
    );
    return {
      ...utils,
      onChangeViewStyle,
      listButton: utils.getByLabelText('collection.collectionTop.viewAsList'),
      gridButton: utils.getByLabelText('collection.collectionTop.viewAsGrid'),
    };
  }

  it('labels the list and grid buttons from the i18n keys', () => {
    const { listButton, gridButton } = renderControl(VIEW_STYLE_LIST);
    expect(listButton).toHaveAttribute('aria-label', 'collection.collectionTop.viewAsList');
    expect(gridButton).toHaveAttribute('aria-label', 'collection.collectionTop.viewAsGrid');
  });

  it('marks only the list button pressed when viewStyle is VIEW_STYLE_LIST', () => {
    const { listButton, gridButton } = renderControl(VIEW_STYLE_LIST);
    expect(listButton).toHaveAttribute('aria-pressed', 'true');
    expect(gridButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks only the grid button pressed when viewStyle is VIEW_STYLE_GRID', () => {
    const { listButton, gridButton } = renderControl(VIEW_STYLE_GRID);
    expect(listButton).toHaveAttribute('aria-pressed', 'false');
    expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChangeViewStyle once with VIEW_STYLE_LIST when the list button is clicked', () => {
    const { listButton, onChangeViewStyle } = renderControl(VIEW_STYLE_GRID);
    fireEvent.click(listButton);
    expect(onChangeViewStyle).toHaveBeenCalledTimes(1);
    expect(onChangeViewStyle).toHaveBeenCalledWith(VIEW_STYLE_LIST);
  });

  it('calls onChangeViewStyle once with VIEW_STYLE_GRID when the grid button is clicked', () => {
    const { gridButton, onChangeViewStyle } = renderControl(VIEW_STYLE_LIST);
    fireEvent.click(gridButton);
    expect(onChangeViewStyle).toHaveBeenCalledTimes(1);
    expect(onChangeViewStyle).toHaveBeenCalledWith(VIEW_STYLE_GRID);
  });
});
