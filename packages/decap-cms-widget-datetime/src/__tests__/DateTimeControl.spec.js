import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import dayjs from 'dayjs';

import DateTimeControl from '../DateTimeControl';

function setup(propsOverrides = {}) {
  const props = {
    forID: 'test-datetime',
    onChange: jest.fn(),
    classNameWrapper: 'classNameWrapper',
    setActiveStyle: jest.fn(),
    setInactiveStyle: jest.fn(),
    value: '',
    t: key => key,
    isDisabled: false,
    field: {
      get: jest.fn().mockReturnValue('DD.MM.YYYY'),
    },
    ...propsOverrides,
  };

  const utils = render(<DateTimeControl {...props} />);
  const scoped = within(utils.container);
  const input = scoped.getByTestId(props.forID);
  const nowButton = scoped.getByTestId('now-button');
  const clearButton = scoped.getByTestId('clear-button');

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
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockDate));
  });

  afterEach(() => {
    jest.useRealTimers();
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
    const { input, props } = setup({ field: new Map() });

    const testDate = '2024-03-15T10:30:00';

    fireEvent.change(input, { target: { value: testDate } });

    const expectedValue = dayjs(testDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    expect(props.onChange).toHaveBeenCalledWith(expectedValue);
  });

  test('sets value in custom format (UTC) when input value changes', () => {
    const { input, props } = setup({ field: new Map([['picker_utc', true]]) });

    const testDate = '2024-03-15T10:30:00';

    fireEvent.change(input, { target: { value: testDate } });

    const expectedValue = dayjs(testDate).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
    expect(props.onChange).toHaveBeenCalledWith(expectedValue);
  });

  test('stores plain date string (YYYY-MM-DD) when time_format is false', () => {
    const field = new Map([['time_format', false]]);
    const { input, props } = setup({ field });

    const testDate = '2024-03-15';
    fireEvent.change(input, { target: { value: testDate } });

    expect(props.onChange).toHaveBeenCalledWith('2024-03-15');
  });

  test('stores plain time string (HH:mm) when date_format is false', () => {
    const field = new Map([['date_format', false]]);
    const { input, props } = setup({ field });

    const testTime = '10:30';
    fireEvent.change(input, { target: { value: testTime } });

    expect(props.onChange).toHaveBeenCalledWith('10:30');
  });

  test('uses custom date_format string when time_format is false', () => {
    const field = new Map([
      ['time_format', false],
      ['date_format', 'DD/MM/YYYY'],
    ]);
    const { input, props } = setup({ field });

    // Native date input supplies YYYY-MM-DD; the stored value is reformatted to the custom format
    const testDate = '2024-03-15';
    fireEvent.change(input, { target: { value: testDate } });

    expect(props.onChange).toHaveBeenCalledWith('15/03/2024');
  });

  test('uses custom time_format string when date_format is false', () => {
    const field = new Map([
      ['date_format', false],
      ['time_format', 'HH:mm:ss'],
    ]);
    const { input, props } = setup({ field });

    const testTime = '10:30:00';
    fireEvent.change(input, { target: { value: testTime } });

    expect(props.onChange).toHaveBeenCalledWith('10:30:00');
  });

  describe('deprecated camelCase aliases', () => {
    test('dateFormat alias produces same result as date_format', () => {
      const field = new Map([
        ['time_format', false],
        ['date_format', 'DD/MM/YYYY'],
      ]);
      const { input, props } = setup({ field });
      const testDate = '2024-03-15';
      fireEvent.change(input, { target: { value: testDate } });
      const snakeResult = props.onChange.mock.calls[0][0];

      const fieldCamel = new Map([
        ['time_format', false],
        ['dateFormat', 'DD/MM/YYYY'],
      ]);
      const { input: inputCamel, props: propsCamel } = setup({
        forID: 'test-datetime-camel',
        field: fieldCamel,
      });
      fireEvent.change(inputCamel, { target: { value: testDate } });

      expect(propsCamel.onChange).toHaveBeenCalledWith(snakeResult);
    });

    test('timeFormat alias produces same result as time_format', () => {
      const field = new Map([
        ['date_format', false],
        ['time_format', 'HH:mm:ss'],
      ]);
      const { input, props } = setup({ field });
      const testTime = '10:30:00';
      fireEvent.change(input, { target: { value: testTime } });
      const snakeResult = props.onChange.mock.calls[0][0];

      const fieldCamel = new Map([
        ['date_format', false],
        ['timeFormat', 'HH:mm:ss'],
      ]);
      const { input: inputCamel, props: propsCamel } = setup({
        forID: 'test-datetime-camel',
        field: fieldCamel,
      });
      fireEvent.change(inputCamel, { target: { value: testTime } });

      expect(propsCamel.onChange).toHaveBeenCalledWith(snakeResult);
    });

    test('pickerUtc alias produces same result as picker_utc', () => {
      const field = new Map([['picker_utc', true]]);
      const { input, props } = setup({ field });
      const testDate = '2024-03-15T10:30:00';
      fireEvent.change(input, { target: { value: testDate } });
      const snakeResult = props.onChange.mock.calls[0][0];

      const fieldCamel = new Map([['pickerUtc', true]]);
      const { input: inputCamel, props: propsCamel } = setup({
        forID: 'test-datetime-camel',
        field: fieldCamel,
      });
      fireEvent.change(inputCamel, { target: { value: testDate } });

      expect(propsCamel.onChange).toHaveBeenCalledWith(snakeResult);
    });
  });
});
