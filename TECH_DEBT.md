# Technical debt

Living list of known issues that aren't urgent enough to block work but should be cleaned up over time. Move items to "Done" rather than deleting them, so the next person can audit what's already been tried.

## Open

### Type safety
- [ ] Remove `as unknown as` double casts in `packages/decap-cms-core/src/backend.tsx`.

### Dependencies
- [ ] Replace `@iarna/toml` — current version uses unsafe `eval` in the parser.
- [ ] `packages/decap-cms-app/src/index.ts` mixes named (`DecapCmsApp`, `default`, `h`) and default exports; pick one.

### Architecture
- [ ] Add ESLint rules to enforce import patterns (e.g. no `package/src/file` imports).
- [ ] `packages/decap-cms-core/src/constants/configSchema.ts` contains non-constants — move logic out.
- [ ] Continue removing leftover Immutable.js helpers; preference is plain ES (`...`, `?.`, `??`).

### File organization
- [ ] Inconsistent `.ts` vs `.tsx` extensions across packages.

## Ideas (not committed)

- Standard Schema integration — let users plug in zod / joi / effect schemas directly.
- Portable text support.
