/**
 * Vendored from the Standard Schema spec (https://github.com/standard-schema/standard-schema),
 * MIT licensed. The spec recommends vendoring these types rather than taking a runtime
 * dependency on the `@standard-schema/spec` package, since they're type-only and erased
 * at build time. This lets a field's `validate` option accept any conformant schema
 * (zod, valibot, arktype, effect Schema, ...) without decap-cms-core depending on any of them.
 */

export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly version: 1;
  readonly vendor: string;
  readonly validate: (
    value: unknown,
  ) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
  readonly types?: StandardSchemaV1Types<Input, Output> | undefined;
}

export type StandardSchemaV1Result<Output> =
  | StandardSchemaV1SuccessResult<Output>
  | StandardSchemaV1FailureResult;

export interface StandardSchemaV1SuccessResult<Output> {
  readonly value: Output;
  readonly issues?: undefined;
}

export interface StandardSchemaV1FailureResult {
  readonly issues: ReadonlyArray<StandardSchemaV1Issue>;
}

export interface StandardSchemaV1Issue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | StandardSchemaV1PathSegment> | undefined;
}

export interface StandardSchemaV1PathSegment {
  readonly key: PropertyKey;
}

export interface StandardSchemaV1Types<Input = unknown, Output = Input> {
  readonly input: Input;
  readonly output: Output;
}

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1Props<Input, Output>;
}
