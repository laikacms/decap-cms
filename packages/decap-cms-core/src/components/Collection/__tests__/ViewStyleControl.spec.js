import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import { colors } from 'decap-cms-ui-default';

import ViewStyleControl from '../ViewStyleControl';
import { VIEW_STYLE_LIST, VIEW_STYLE_GRID } from '../../../constants/collectionViews';

expect.extend(matchers);

jest.mock('decap-cms-ui-default', () => {
  const actual = jest.requireActual('decap-cms-ui-default');
  return {
    ...actual,
    Icon: 'mocked-icon',
  };
});

describe('ViewStyleControl', () => {
  const t = jest.fn(key => key);

  const defaultProps = {
    viewStyle: VIEW_STYLE_LIST,
    onChangeViewStyle: jest.fn(),
    t,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list view button and a grid view button', () => {
    const { getByLabelText } = render(<ViewStyleControl {...defaultProps} />);

    expect(getByLabelText('collection.collectionTop.viewAsList')).toBeInTheDocument();
    expect(getByLabelText('collection.collectionTop.viewAsGrid')).toBeInTheDocument();
  });

  it('styles the list button as active when viewStyle is VIEW_STYLE_LIST', () => {
    const { getByLabelText } = render(
      <ViewStyleControl {...defaultProps} viewStyle={VIEW_STYLE_LIST} />,
    );

    expect(getByLabelText('collection.collectionTop.viewAsList')).toHaveStyleRule(
      'color',
      colors.active,
    );
    expect(getByLabelText('collection.collectionTop.viewAsGrid')).toHaveStyleRule(
      'color',
      '#b3b9c4',
    );
  });

  it('styles the grid button as active when viewStyle is VIEW_STYLE_GRID', () => {
    const { getByLabelText } = render(
      <ViewStyleControl {...defaultProps} viewStyle={VIEW_STYLE_GRID} />,
    );

    expect(getByLabelText('collection.collectionTop.viewAsGrid')).toHaveStyleRule(
      'color',
      colors.active,
    );
    expect(getByLabelText('collection.collectionTop.viewAsList')).toHaveStyleRule(
      'color',
      '#b3b9c4',
    );
  });

  it('calls onChangeViewStyle with VIEW_STYLE_LIST when the list button is clicked', () => {
    const { getByLabelText } = render(
      <ViewStyleControl {...defaultProps} viewStyle={VIEW_STYLE_GRID} />,
    );

    fireEvent.click(getByLabelText('collection.collectionTop.viewAsList'));

    expect(defaultProps.onChangeViewStyle).toHaveBeenCalledWith(VIEW_STYLE_LIST);
  });

  it('calls onChangeViewStyle with VIEW_STYLE_GRID when the grid button is clicked', () => {
    const { getByLabelText } = render(<ViewStyleControl {...defaultProps} />);

    fireEvent.click(getByLabelText('collection.collectionTop.viewAsGrid'));

    expect(defaultProps.onChangeViewStyle).toHaveBeenCalledWith(VIEW_STYLE_GRID);
  });
});
