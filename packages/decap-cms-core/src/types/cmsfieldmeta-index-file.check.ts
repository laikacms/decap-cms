// Compile-time assertions for the public CmsFieldMeta.index_file field (DCMS-324).
//
// index_file must be optional in the public index.d.ts type, matching the
// internal redux.ts mirror, the JSON schema, and runtime behavior (which all
// already treat it as optional/opt-in).
// Included by tsc via the src glob in tsconfig but not picked up by Jest
// (no .spec/.test suffix and not inside __tests__).

import type { CmsFieldMeta } from 'decap-cms-core';

// Valid — index_file omitted entirely must type-check.
const _omitted: CmsFieldMeta = {
  name: 'path',
  label: 'Path',
  widget: 'string',
  required: false,
  meta: true,
};

// Valid — index_file explicitly provided must still type-check.
const _provided: CmsFieldMeta = {
  name: 'path',
  label: 'Path',
  widget: 'string',
  required: false,
  index_file: 'index',
  meta: true,
};

// Silence noUnusedLocals.
void _omitted, _provided;
