// Compile-time assertions for CmsFieldNumber.value_type / valueType.
//
// Only 'int' and 'float' are valid per the runtime schema enum.
// Included by tsc via the src glob in tsconfig but not picked up by Jest
// (no .spec/.test suffix and not inside __tests__).

import type { CmsFieldNumber } from './redux';

// Valid values — must compile without error.
const _int: CmsFieldNumber = { widget: 'number', value_type: 'int' };
const _float: CmsFieldNumber = { widget: 'number', value_type: 'float' };
const _depInt: CmsFieldNumber = { widget: 'number', valueType: 'int' };
const _depFloat: CmsFieldNumber = { widget: 'number', valueType: 'float' };
const _omitted: CmsFieldNumber = { widget: 'number' };

// Invalid values — must be rejected at compile time.
// @ts-expect-error 'decimal' is not assignable to 'int' | 'float'
const _decimal: CmsFieldNumber = { widget: 'number', value_type: 'decimal' };

// @ts-expect-error arbitrary string is not assignable to 'int' | 'float'
const _integer: CmsFieldNumber = { widget: 'number', valueType: 'integer' };

// Silence noUnusedLocals.
void _int, _float, _depInt, _depFloat, _omitted, _decimal, _integer;
