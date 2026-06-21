import type { Mapper } from './types';

const registry = new Map<string, Mapper>();

/** Register a mapper. A later registration with the same `id` replaces it. */
export function registerMapper(mapper: Mapper): void {
  registry.set(mapper.id, mapper);
}

/** Remove a mapper from the registry. */
export function unregisterMapper(id: string): void {
  registry.delete(id);
}

/** True when a mapper with this id is registered. */
export function hasMapper(id: string): boolean {
  return registry.has(id);
}

/** Get a registered mapper, or throw if the id is unknown. */
export function getMapper(id: string): Mapper {
  const mapper = registry.get(id);
  if (!mapper) {
    throw new Error(
      `lib-richtext: no mapper registered for id "${id}". `
        + `Registered: ${[...registry.keys()].join(', ') || '(none)'}`,
    );
  }
  return mapper;
}

/** All registered mappers, in registration order. */
export function listMappers(): Mapper[] {
  return [...registry.values()];
}
