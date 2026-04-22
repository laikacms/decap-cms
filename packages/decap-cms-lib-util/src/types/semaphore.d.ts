declare module 'semaphore' {
  export type Semaphore = { take: (f: (...args: unknown[]) => unknown) => void; leave: () => void };
  const semaphore: (count: number) => Semaphore;
  export default semaphore;
}
