# Technical Debt

## Cleanup Done
- [x] Remove jest.config.ts from decap-server (migrated to vitest)

## Import Issues
- [x] Direct source imports: `'package/src/file'` → `'package'`
- [ ] Inconsistent file extensions (.ts vs .tsx)

## Type Safety
- [x] Replace `Map<string, any>` with proper typed records
- [x] Remove `as unknown as` double casts in backend.tsx
- [x] Add missing @types dependencies to packages

## Dependencies
- [x] React 19 peer dependency mismatches (react-aria-menubutton, etc.)
- [x] Redux 5 peer dependency mismatches (redux-devtools-extension)
- [x] Slate version mismatches (slate-base64-serializer, slate-plain-serializer)
- [x] @iarna+toml uses unsafe eval (remove)
- [ ] Entry module "packages/decap-cms-app/src/index.ts" is using named (including "DecapCmsApp", "default", "h") and default exports together.

## Architecture
- [x] Put shared types in `decap-cms-lib-util` package
- [x] Remove Immutable.js
- [ ] Add ESLint rules for import patterns
- [ ] Constants contain non-constants: packages/decap-cms-core/src/constants/configSchema.ts
- [ ] Immutable.js is causing to many problems, policy is to try and avoid using it and replacing it with ES6 syntax (spread operator, ?. operator)

# Testing
- [x] Fix failing tests in decap-cms-core

# Ideas
- [ ] Standard Schema integration (so people can use their zod, joi, effect, etc schemas directly)
- [ ] Portable text


