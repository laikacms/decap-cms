import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReport } from '@/ui/editor/editor-hooks/useReport';

const getContainer = () => document.getElementById('report-container');

describe('useReport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    getContainer()?.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates one #report-container in document.body with the content and returns the timeout handle', () => {
    const { result } = renderHook(() => useReport());

    const handle = result.current('hello');

    const containers = document.body.querySelectorAll('#report-container');
    expect(containers).toHaveLength(1);
    expect(containers[0].parentElement).toBe(document.body);
    expect(containers[0].innerHTML).toBe('hello');
    expect(vi.getTimerCount()).toBe(1);
    expect(handle).toBeDefined();
  });

  it('reuses the element on a second call, replaces content and restarts the 1s timer', () => {
    const { result } = renderHook(() => useReport());

    result.current('first');
    const first = getContainer();
    vi.advanceTimersByTime(600);

    result.current('second');

    expect(document.body.querySelectorAll('#report-container')).toHaveLength(1);
    expect(getContainer()).toBe(first);
    expect(first?.innerHTML).toBe('second');
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(999);
    expect(getContainer()).toBe(first);

    vi.advanceTimersByTime(1);
    expect(getContainer()).toBeNull();
  });

  it('removes the container from document.body after 1s', () => {
    const { result } = renderHook(() => useReport());

    result.current('bye');

    vi.advanceTimersByTime(999);
    expect(getContainer()).not.toBeNull();

    vi.advanceTimersByTime(1);
    expect(getContainer()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears a pending timer and removes the container on unmount', () => {
    const { result, unmount } = renderHook(() => useReport());

    result.current('pending');
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(getContainer()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
