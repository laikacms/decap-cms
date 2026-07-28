/**
 * Type utilities and runtime schema converters for a Decap CMS config loaded
 * as a const-asserted value (e.g. the `config.gen.ts` produced by
 * `laika local generate`). See `./types.ts` for the compile-time utilities
 * and `./to-schema.ts` for the runtime validation-schema converters.
 */
export * from './to-schema';
export * from './types';
