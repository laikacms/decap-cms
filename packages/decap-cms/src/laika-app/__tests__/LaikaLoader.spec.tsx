import { act, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LaikaLoader from '@/laika-app/LaikaLoader';

describe('LaikaLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a single string label', () => {
    const { getByText, getAllByRole } = render(<LaikaLoader label="Loading config…" />);
    expect(getByText('Loading config…')).toBeInTheDocument();
    // The outer block + inner LaikaSpinner both have role="status" — confirm
    // at least one is present rather than asserting on a unique match.
    expect(getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('rotates through array labels on a 5-second interval', () => {
    const { getByText, queryByText } = render(
      <LaikaLoader label={['First', 'Second', 'Third']} context="entries" />,
    );
    expect(getByText('First')).toBeInTheDocument();
    expect(queryByText('Second')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(getByText('Second')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(getByText('Third')).toBeInTheDocument();
  });

  it('renders without a label when none is supplied', () => {
    const { getAllByRole } = render(<LaikaLoader />);
    expect(getAllByRole('status').length).toBeGreaterThan(0);
  });
});
