import { flow } from 'lodash-es';

export function thenP<T, V>(fn: (r: T) => V) {
  return (p: Promise<T>) => Promise.resolve(p).then(fn);
}

const filterPromiseSymbol = Symbol('filterPromiseSymbol');

export function onlySuccessfulPromises(promises: Promise<unknown>[]) {
  return Promise.all(promises.map(p => p.catch(() => filterPromiseSymbol))).then(results =>
    results.filter(result => result !== filterPromiseSymbol)
  );
}

function wrapFlowAsync(fn: (arg: unknown) => unknown) {
  return async (arg: unknown) => fn(await arg);
}

export function flowAsync(fns: ((arg: unknown) => unknown)[]) {
  return flow(fns.map(fn => wrapFlowAsync(fn)));
}
