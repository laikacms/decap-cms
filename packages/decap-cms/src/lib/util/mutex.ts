export type Releaser = () => void;

export type Mutex = { acquire: () => Promise<Releaser> };

/**
 * Serializes async operations. `acquire` resolves with a release function once
 * the mutex is free, or rejects with `timeoutError` after `timeout` ms of
 * waiting. A timed-out waiter gives up its queue slot, so waiters behind it
 * are not blocked.
 */
export function createMutex({
  timeout,
  timeoutError,
}: {
  timeout: number,
  timeoutError: Error,
}): Mutex {
  let queue: Promise<void> = Promise.resolve();

  function acquire(): Promise<Releaser> {
    let release!: Releaser;
    const slot = new Promise<void>(resolve => {
      release = resolve;
    });
    const prev = queue;
    queue = prev.then(() => slot);

    return new Promise<Releaser>((resolve, reject) => {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        reject(timeoutError);
      }, timeout);
      prev.then(() => {
        clearTimeout(timer);
        if (timedOut) {
          release();
        } else {
          resolve(release);
        }
      });
    });
  }

  return { acquire };
}
