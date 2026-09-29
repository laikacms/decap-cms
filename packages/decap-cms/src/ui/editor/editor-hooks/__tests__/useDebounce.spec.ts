import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce } from '@/ui/editor/editor-hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call fn before ms elapses and calls once with the last args', () => {
    const fn = vi.fn((_value: string) => {});
    const { result } = renderHook(() => useDebounce(fn, 100));

    result.current('a');
    result.current('b');
    result.current('c');

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('invokes the latest fn after rerender, not the stale one', () => {
    const first = vi.fn((_value: string) => {});
    const second = vi.fn((_value: string) => {});
    const { result, rerender } = renderHook(({ fn }) => useDebounce(fn, 100), {
      initialProps: { fn: first },
    });

    result.current('x');
    rerender({ fn: second });
    vi.advanceTimersByTime(100);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith('x');
  });

  it('keeps function identity across rerenders with same ms/maxWait', () => {
    const { result, rerender } = renderHook(
      ({ fn }) => useDebounce(fn, 100, 500),
      { initialProps: { fn: () => {} } },
    );
    const initial = result.current;

    rerender({ fn: () => {} });

    expect(result.current).toBe(initial);
  });

  it('changes function identity when ms changes', () => {
    const fn = () => {};
    const { result, rerender } = renderHook(({ ms }) => useDebounce(fn, ms), {
      initialProps: { ms: 100 },
    });
    const initial = result.current;

    rerender({ ms: 200 });

    expect(result.current).not.toBe(initial);
  });

  it('changes function identity when maxWait changes', () => {
    const fn = () => {};
    const { result, rerender } = renderHook(({ maxWait }) => useDebounce(fn, 100, maxWait), {
      initialProps: { maxWait: 500 },
    });
    const initial = result.current;

    rerender({ maxWait: 1000 });

    expect(result.current).not.toBe(initial);
  });

  it('forces an invocation at maxWait during continuous calls', () => {
    const fn = vi.fn((_value: number) => {});
    const { result } = renderHook(() => useDebounce(fn, 100, 250));

    for (let i = 0; i < 5; i++) {
      result.current(i);
      vi.advanceTimersByTime(60);
    }

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(4);
  });
});
