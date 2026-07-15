import { describe, expect, it, vi } from 'vitest';

import { createSemaphore } from '@/lib/util/semaphore.js';

describe('semaphore', () => {
  it('runs take immediately while available capacity remains', () => {
    const sem = createSemaphore(2);
    const first = vi.fn();
    const second = vi.fn();

    sem.take(first);
    sem.take(second);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('queues take once capacity is exhausted and drains the queue in FIFO order on leave', () => {
    const sem = createSemaphore(1);
    const order: number[] = [];

    sem.take(() => order.push(1));
    sem.take(() => order.push(2));
    sem.take(() => order.push(3));

    // only the first take should have run immediately (capacity 1)
    expect(order).toEqual([1]);

    sem.leave();
    expect(order).toEqual([1, 2]);

    sem.leave();
    expect(order).toEqual([1, 2, 3]);
  });

  it('throws when leave is called more times than outstanding take()s', () => {
    const sem = createSemaphore(1);

    sem.take(() => {});
    sem.leave();

    expect(() => sem.leave()).toThrow('leave called too many times.');
  });

  it('throws on leave for a fresh semaphore with no outstanding take()s', () => {
    const sem = createSemaphore(1);

    expect(() => sem.leave()).toThrow('leave called too many times.');
  });
});
