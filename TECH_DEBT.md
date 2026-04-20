# Technical Debt

## Cleanup Done
- [x] Remove jest.config.ts from decap-server (migrated to vitest)

## Import Issues
- [ ] Direct source imports: `'package/src/file'` → `'package'`
- [ ] Inconsistent file extensions (.ts vs .tsx)

## Type Safety
- [ ] Replace `Map<string, any>` with proper typed records
- [ ] Remove `as unknown as` double casts in backend.tsx
- [ ] Add missing @types dependencies to packages

## Dependencies
- [ ] React 19 peer dependency mismatches (react-aria-menubutton, etc.)
- [ ] Redux 5 peer dependency mismatches (redux-devtools-extension)
- [ ] Slate version mismatches (slate-base64-serializer, slate-plain-serializer)
- [ ] @iarna+toml uses unsafe eval (remove)
- [ ] Entry module "packages/decap-cms-app/src/index.ts" is using named (including "DecapCmsApp", "default", "h") and default exports together.

## Architecture
- [ ] Create shared `decap-cms-types` package
- [ ] Standardize Immutable.js typed wrappers
- [ ] Add ESLint rules for import patterns
- [ ] Constants contain non-constants: packages/decap-cms-core/src/constants/configSchema.ts

# Testing
- [ ] Fix failing tests in decap-cms-core

