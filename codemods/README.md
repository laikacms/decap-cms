# Decap CMS TypeScript Codemods

Custom [jscodeshift](https://github.com/facebook/jscodeshift) codemods for improving TypeScript quality in the Decap CMS monorepo.

## Overview

These codemods address three categories of issues:

| # | Codemod | Description |
|---|---------|-------------|
| 1 | `rename-ts-to-tsx.js` | Renames `.ts` files that contain JSX to `.tsx` |
| 2 | `fix-ts-patterns.js` | Fixes bad TypeScript patterns (`@ts-ignore`, `any`, etc.) |
| 3 | `proptypes-to-ts.js` | Extracts TypeScript interfaces from PropTypes (keeps PropTypes) |

## Quick Start

```bash
# Preview all changes (dry run)
node codemods/run-all.js --dry-run

# Apply all codemods
node codemods/run-all.js

# Run a specific step only
node codemods/run-all.js --step=1
node codemods/run-all.js --step=2
node codemods/run-all.js --step=3
```

## Codemod Details

### 1. Rename `.ts` → `.tsx` (`rename-ts-to-tsx.js`)

Uses jscodeshift's TSX parser to detect `JSXElement` and `JSXFragment` nodes in `.ts` files. Files containing JSX are renamed to `.tsx` using `git mv` for proper version control tracking, and any import references with explicit `.ts` extensions are updated.

**Before:**
```
packages/decap-cms-widget-boolean/src/BooleanControl.ts  (contains JSX)
```

**After:**
```
packages/decap-cms-widget-boolean/src/BooleanControl.tsx
```

**Run individually:**
```bash
node codemods/rename-ts-to-tsx.js --dry-run
node codemods/rename-ts-to-tsx.js
```

### 2. Fix TypeScript Patterns (`fix-ts-patterns.js`)

A jscodeshift transform that fixes common TypeScript anti-patterns:

| Pattern | Before | After |
|---------|--------|-------|
| `@ts-ignore` | `// @ts-ignore` | `// @ts-expect-error -- TODO: fix underlying type issue` |
| Catch clause `any` | `catch (error: any)` | `catch (error: unknown)` |
| Untyped catch | `catch (e)` | `catch (e: unknown)` |
| Empty object `as any` | `return {} as any` | `return {} as unknown` |

**Run individually:**
```bash
# Dry run with output
npx jscodeshift --parser=tsx --extensions=ts,tsx \
  -t codemods/fix-ts-patterns.js --dry --print packages/

# Apply
npx jscodeshift --parser=tsx --extensions=ts,tsx \
  -t codemods/fix-ts-patterns.js packages/
```

### 3. PropTypes → TypeScript Interfaces (`proptypes-to-ts.js`)

Extracts TypeScript interfaces from PropTypes definitions while **keeping PropTypes intact** for JavaScript users. Supports both class components and function components.

**PropTypes mapping:**

| PropTypes | TypeScript |
|-----------|-----------|
| `PropTypes.string` | `string` |
| `PropTypes.number` | `number` |
| `PropTypes.bool` | `boolean` |
| `PropTypes.func` | `(...args: unknown[]) => unknown` |
| `PropTypes.object` | `Record<string, unknown>` |
| `PropTypes.array` | `unknown[]` |
| `PropTypes.node` | `React.ReactNode` |
| `PropTypes.element` | `React.ReactElement` |
| `PropTypes.any` | `unknown` |
| `PropTypes.oneOfType([...])` | Union type |
| `PropTypes.arrayOf(T)` | `T[]` |
| `PropTypes.shape({...})` | Inline object type |
| `ImmutablePropTypes.map` | `ImmutableMap<string, unknown>` |
| `ImmutablePropTypes.list` | `ImmutableList<unknown>` |

**Before:**
```typescript
export default class BooleanControl extends React.Component {
  // ...
}

BooleanControl.propTypes = {
  field: ImmutablePropTypes.map.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.bool,
};
```

**After:**
```typescript
interface BooleanControlProps {
  field: ImmutableMap<string, unknown>;
  onChange: (...args: unknown[]) => unknown;
  value?: boolean;
}

export default class BooleanControl extends React.Component<BooleanControlProps> {
  // ...
}

BooleanControl.propTypes = {
  field: ImmutablePropTypes.map.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.bool,
};
```

**Run individually:**
```bash
# Dry run with output
npx jscodeshift --parser=tsx --extensions=ts,tsx \
  -t codemods/proptypes-to-ts.js --dry --print packages/

# Apply
npx jscodeshift --parser=tsx --extensions=ts,tsx \
  -t codemods/proptypes-to-ts.js packages/
```

## Prerequisites

jscodeshift is installed as a dev dependency:

```bash
pnpm add -Dw jscodeshift @types/jscodeshift
```

## After Running

After applying the codemods, run the type checker to verify:

```bash
pnpm type-check
```

Some manual fixes may still be needed for complex cases. The codemods are designed to be safe and conservative — they won't modify code they can't confidently transform.
