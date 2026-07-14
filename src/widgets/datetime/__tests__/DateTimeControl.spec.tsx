import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';

import DateTimeControl from '@/widgets/datetime/DateTimeControl';

function setup(propsOverrides = {}) {
  const props = {
    forID: 'test-datetime',
    onChange: vi.fn(),
    classNameWrapper: 'classNameWrapper',
    setActiveStyle: vi.fn(),
    setInactiveStyle: vi.fn(),
    value: '',
    t: key => key,
    isDisabled: false,
    field: {
      format: 'DD.MM.YYYY',
    },
    ...propsOverrides,
  };

  const utils = render(<DateTimeControl {...props} />);
  const input = utils.getByTestId('test-datetime');
  const nowButton = utils.getByTestId('now-button');
  const clearButton = utils.getByTestId('clear-button');

  return {
    ...utils,
    props,
    input,
    nowButton,
    clearButton,
  };
}

describe('DateTimeControl', () => {
  const mockDate = '2025-01-01T12:00:00.000Z';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(mockDate));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders the component with input, now button, and clear button', () => {
    const { getByTestId } = setup();
    expect(getByTestId('test-datetime')).toBeInTheDocument();
    expect(getByTestId('now-button')).toBeInTheDocument();
    expect(getByTestId('clear-button')).toBeInTheDocument();
  });

  test('set value to current date if now button is clicked', () => {
    const { nowButton, props } = setup();
    fireEvent.click(nowButton);
    expect(props.onChange).toHaveBeenCalledWith(dayjs().format('DD.MM.YYYY'));
  });

  test('set value to empty string if clear button is clicked', () => {
    const { clearButton, props } = setup({ value: '1970-01-01' });
    fireEvent.click(clearButton);
    expect(props.onChange).toHaveBeenCalledWith('');
  });

  test('sets value in custom format (local timezone) when input value changes', () => {
    const { input, props } = setup({ field: {} });

    const testDate = '2024-03-15T10:30:00';

    fireEvent.change(input, { target: { value: testDate } });

    const expectedValue = dayjs(testDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    expect(props.onChange).toHaveBeenCalledWith(expectedValue);
  });

  test('sets value in custom format (UTC) when input value changes', () => {
    const { input, props } = setup({ field: { picker_utc: true } });

    const testDate = '2024-03-15T10:30:00';

    fireEvent.change(input, { target: { value: testDate } });

    const expectedValue = dayjs(testDate).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
    expect(props.onChange).toHaveBeenCalledWith(expectedValue);
  });

  test('substitutes {{now}} on mount and flags the change as a framework default (DCMS-416)', () => {
    const { props } = setup({ value: '{{now}}', field: {} });

    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(props.onChange).toHaveBeenCalledWith(dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZ'), {
      fromDefault: true,
    });
  });

  test('does not flag user-initiated changes as a framework default', () => {
    const { nowButton, props } = setup({ value: '{{now}}', field: {} });

    props.onChange.mockClear();
    fireEvent.click(nowButton);

    expect(props.onChange).toHaveBeenCalledWith(dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
  });
});
