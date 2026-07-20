import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importPlugin from 'eslint-plugin-import-x';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import unicornPlugin from 'eslint-plugin-unicorn';
import fs from 'fs';
import globals from 'globals';
import { createRequire } from 'module';
import path from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const emotionPlugin = require('@emotion/eslint-plugin');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Post-restructure the former `packages/decap-cms-<name>` workspaces live under
// `src/<name>`; map them back to their published package names so cross-package
// specifiers are still treated as resolvable core modules by import/no-unresolved.
const srcDir = path.join(__dirname, 'src');
const packages = (fs.existsSync(srcDir) ? fs.readdirSync(srcDir, { withFileTypes: true }) : [])
  .filter(dirent => dirent.isDirectory())
  .map(dirent => (dirent.name === 'dev-server' ? 'decap-server' : `decap-cms-${dirent.name}`));

// Component layering (see src/ui/README.md). Lower layers are dependencies of
// higher ones and must never import upward; rank-4 realms are siblings and
// must not import each other's components:
//   1. ui             (src/ui, incl. src/ui/editor)
//   2. ui/default, ui/auth
//   3. widgets
//   4. core/components | app/components | laika-app
// Non-component infrastructure (core/actions, core/hooks, core/i18n, lib,
// backends, …) sits outside the model and is unrestricted. Order matters:
// longest prefix must come first so `ui/default` wins over `ui`.
const COMPONENT_LAYERS = [
  { name: 'ui/default', prefix: 'ui/default/', rank: 2 },
  { name: 'ui/auth', prefix: 'ui/auth/', rank: 2 },
  { name: 'ui', prefix: 'ui/', rank: 1 },
  { name: 'widgets', prefix: 'widgets/', rank: 3 },
  { name: 'core/components', prefix: 'core/components/', rank: 4 },
  { name: 'app/components', prefix: 'app/components/', rank: 4 },
  { name: 'laika-app', prefix: 'laika-app/', rank: 4 },
];

function componentLayerOf(srcRelativePath) {
  return COMPONENT_LAYERS.find(layer => srcRelativePath.startsWith(layer.prefix));
}

// Local plugin: rewrite parent-relative imports (`../…`) that point inside
// `src/` to the `@/…` alias (mirrors tsconfig `paths` + the vite / tsc-alias
// config). Same-folder imports (`./x`) are intentionally left alone. Ships a
// fixer so `eslint --fix` / editor "fix on save" converts automatically.
// Written inline because the published `eslint-plugin-no-relative-import-paths`
// still calls the ESLint-10-removed `context.getCwd()`.
const localImportAliasPlugin = {
  rules: {
    'layer-deps': {
      meta: {
        type: 'problem',
        schema: [
          {
            type: 'object',
            properties: {
              // "from>to" layer-name pairs that are sanctioned exceptions to
              // the rank order - deliberate architecture, not debt.
              allowed: { type: 'array', items: { type: 'string' } },
              // "from>to" layer-name pairs that are known, tracked debt. They
              // are tolerated so the rule can land, but new edges outside this
              // list are errors. Burn this list down; never grow it.
              grandfathered: { type: 'array', items: { type: 'string' } },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          upwardImport:
            "Layer '{{from}}' (rank {{fromRank}}) must not import from higher layer '{{to}}' (rank {{toRank}}). Dependency order: ui → ui/default → widgets → core/app/laika components.",
          siblingImport:
            "'{{from}}' and '{{to}}' are sibling component realms (rank 4) and must not import each other. Move the shared component down into ui/, ui/default/, or widgets/.",
        },
      },
      create(context) {
        const filename = context.filename ?? context.getFilename?.();
        // Specs/stories legitimately cross layers to exercise integration.
        if (/\.(spec|test|stories)\.|__tests__/.test(filename)) return {};
        const fileAbs = path.resolve(filename);
        if (!fileAbs.startsWith(srcDir + path.sep)) return {};
        const fileRel = path.relative(srcDir, fileAbs).split(path.sep).join('/');
        const fromLayer = componentLayerOf(fileRel);
        if (!fromLayer) return {};
        const exempted = new Set([
          ...(context.options[0]?.allowed ?? []),
          ...(context.options[0]?.grandfathered ?? []),
        ]);

        function check(node) {
          const source = node.source;
          if (!source || typeof source.value !== 'string') return;
          const value = source.value;
          let targetRel;
          if (value.startsWith('@/')) {
            targetRel = value.slice(2);
          } else if (value.startsWith('./') || value.startsWith('../')) {
            const abs = path.resolve(path.dirname(fileAbs), value);
            if (!abs.startsWith(srcDir + path.sep)) return;
            targetRel = path.relative(srcDir, abs).split(path.sep).join('/');
          } else {
            return; // bare package specifier
          }
          const toLayer = componentLayerOf(targetRel + '/');
          if (!toLayer || toLayer.name === fromLayer.name) return;
          if (toLayer.rank < fromLayer.rank) return;
          if (toLayer.rank === fromLayer.rank && fromLayer.rank < 4) return;
          if (exempted.has(`${fromLayer.name}>${toLayer.name}`)) return;
          context.report({
            node: source,
            messageId: toLayer.rank === fromLayer.rank ? 'siblingImport' : 'upwardImport',
            data: {
              from: fromLayer.name,
              to: toLayer.name,
              fromRank: String(fromLayer.rank),
              toRank: String(toLayer.rank),
            },
          });
        }
        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
          ImportExpression: check,
        };
      },
    },
    'prefer-alias': {
      meta: {
        type: 'suggestion',
        fixable: 'code',
        schema: [],
        messages: {
          preferAlias: "Use the '@/' alias instead of the relative parent import '{{ source }}'.",
        },
      },
      create(context) {
        const filename = context.filename ?? context.getFilename?.();
        function check(node) {
          const source = node.source;
          if (!source || typeof source.value !== 'string') return;
          const value = source.value;
          if (!value.startsWith('../')) return;
          const abs = path.resolve(path.dirname(filename), value);
          // Only rewrite targets that live under src/.
          if (abs !== srcDir && !abs.startsWith(srcDir + path.sep)) return;
          const rel = path.relative(srcDir, abs).split(path.sep).join('/');
          const aliased = `@/${rel}`;
          context.report({
            node: source,
            messageId: 'preferAlias',
            data: { source: value },
            fix: fixer => fixer.replaceText(source, `'${aliased}'`),
          });
        }
        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
          ImportExpression: check,
        };
      },
    },
  },
};

export default tseslint.config(
  // Global ignores (must stay a standalone object: adding any other key would
  // turn these into per-config ignores instead of global ones)
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      '**/.exclude*/**',
    ],
  },
  // Global rules
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/\\u2014/]',
          // eslint-disable-next-line no-restricted-syntax
          message: 'No em dashes (—): use a hyphen, comma, or reword.',
        },
        {
          selector: 'TemplateElement[value.raw=/\\u2014/]',
          // eslint-disable-next-line no-restricted-syntax
          message: 'No em dashes (—): use a hyphen, comma, or reword.',
        },
        {
          selector: 'JSXText[value=/\\u2014/]',
          // eslint-disable-next-line no-restricted-syntax
          message: 'No em dashes (—): use a hyphen, comma, or reword.',
        },
      ],
    },
  },
  // Base ESLint recommended rules
  eslint.configs.recommended,
  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,
  // Main configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      unicorn: unicornPlugin,
      '@emotion': emotionPlugin,
      local: localImportAliasPlugin,
    },
    languageOptions: {
      ecmaVersion: 2026,
      sourceType: 'module',
      parserOptions: {
        // Both the repo root and this package contain tsconfigs, so the
        // parser's tsconfigRootDir inference is ambiguous; pin it here.
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
        ...globals.browser,

        DECAP_CMS_VERSION: 'readonly',
        DECAP_CMS_APP_VERSION: 'readonly',
        DECAP_CMS_CORE_VERSION: 'readonly',
        CMS_ENV: 'readonly',
      },
    },
    settings: {
      react: {
        version: '19.2',
      },
      // eslint-plugin-import-x uses the new resolver interface; the legacy
      // string-keyed `typescript`/`node` resolvers don't pick up this repo's
      // `moduleResolution: "bundler"` tsconfig, which left `src/` sibling
      // imports unresolved and misgrouped by import/order.
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          // cwd-independent so IDE servers running from the repo root resolve the same tsconfig
          project: path.join(__dirname, 'tsconfig.json'),
        }),
      ],
      'import/core-modules': [...packages, 'decap-cms-app/dist/esm'],
    },
    rules: {
      // General rules
      'no-console': 'off',
      'require-atomic-updates': 'off',
      'object-shorthand': ['error', 'always'],
      // 'func-style': ['error', 'declaration'], // TODO: Remove? (feedback please - Sem)
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-duplicate-imports': 'off', // handled by @typescript-eslint

      // React rules
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            'css',
            'bold',
            'italic',
            'delete',
            'strikethrough',
            // Vendored cmdk-base primitive (src/ui/cmdk.tsx, DCMS-549) uses
            // these as plain DOM attribute selectors instead of classes.
            'cmdk-root',
            'cmdk-label',
            'cmdk-item',
            'cmdk-group',
            'cmdk-group-heading',
            'cmdk-group-items',
            'cmdk-separator',
            'cmdk-input',
            'cmdk-list',
            'cmdk-list-sizer',
            'cmdk-empty',
          ],
        },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import rules
      'import/no-named-as-default': 'off',
      // Enforce the component dependency order (ui → ui/default → widgets →
      // core/app/laika components; rank-4 realms must not cross-import).
      // `allowed`: the app shell composing core/components pages is sanctioned
      // architecture. `grandfathered`: pre-existing debt from before the
      // layering was adopted (laika-app wraps the app shell and core pages) -
      // shrink that list by moving shared components down the stack; NEVER add
      // new edges to it.
      'local/layer-deps': [
        'error',
        {
          allowed: ['app/components>core/components'],
          grandfathered: ['laika-app>app/components', 'laika-app>core/components'],
        },
      ],
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index'], ['type']],
        },
      ],
      // Emotion rules
      '@emotion/no-vanilla': 'error',
      '@emotion/pkg-renaming': 'error',
      '@emotion/import-from-emotion': 'error',
      '@emotion/styled-import': 'error',

      // Unicorn rules
      'unicorn/prefer-string-slice': 'error',

      // TypeScript rules
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // handled by TypeScript compiler
      '@typescript-eslint/no-empty-object-type': 'off', // TODO: Remove
      '@typescript-eslint/no-unsafe-function-type': 'off', // TODO: Remove
      '@typescript-eslint/no-explicit-any': 'off', // TODO: Remove
    },
  },
  // CommonJS config files (.cjs)
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  // The `@/` alias convention applies inside `src/` only: files outside it
  // (.storybook, playwright, dev-test) are bundled/type-checked without the
  // alias, so parent-relative imports into `src/` are correct there.
  {
    files: ['src/**/*.{ts,tsx,js,mjs}'],
    rules: {
      // Auto-convert deep relative imports to the `@/` alias (autofix). Same-folder
      // (`./x`) imports are left as-is; anything reaching into a parent (`../…`)
      // that resolves inside `src/` becomes `@/…` (mirrors tsconfig `paths` +
      // the vite / tsc-alias config).
      'local/prefer-alias': 'error',
    },
  },
  // Playwright e2e suite: fixture callbacks are conventionally named `use`
  // (per Playwright docs), which the React hooks rule mistakes for a hook.
  // There is no React code in the e2e specs, so the rules don't apply.
  {
    files: ['playwright/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  // Storybook story files
  {
    files: ['**/*.stories.ts', '**/*.stories.tsx'],
    rules: {
      // CSF `render` functions legitimately call hooks to drive interactive
      // demos; the rule only flags them because `render` isn't capitalized.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // Prettier config (must be last to override other formatting rules)
  prettierConfig,
);
