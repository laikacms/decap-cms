import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import cypressPlugin from 'eslint-plugin-cypress';
import importPlugin from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import unicornPlugin from 'eslint-plugin-unicorn';
import prettierConfig from 'eslint-config-prettier';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const emotionPlugin = require('@emotion/eslint-plugin');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Post-restructure the former `packages/decap-cms-<name>` workspaces live under
// `src/<name>`; map them back to their published package names so cross-package
// specifiers are still treated as resolvable core modules by import/no-unresolved.
const srcDir = path.join(__dirname, 'src');
const packages = (fs.existsSync(srcDir) ? fs.readdirSync(srcDir, { withFileTypes: true }) : [])
  .filter(dirent => dirent.isDirectory())
  .map(dirent => (dirent.name === 'server' ? 'decap-server' : `decap-cms-${dirent.name}`));

// Local plugin: rewrite parent-relative imports (`../…`) that point inside
// `src/` to the `@/…` alias (mirrors tsconfig `paths` + the vite / tsc-alias
// config). Same-folder imports (`./x`) are intentionally left alone. Ships a
// fixer so `eslint --fix` / editor "fix on save" converts automatically.
// Written inline because the published `eslint-plugin-no-relative-import-paths`
// still calls the ESLint-10-removed `context.getCwd()`.
const localImportAliasPlugin = {
  rules: {
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
  // Global ignores
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
    }
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
          project: './tsconfig.json',
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
      'react/prop-types': 'off',
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
      // Auto-convert deep relative imports to the `@/` alias (autofix). Same-folder
      // (`./x`) imports are left as-is; anything reaching into a parent (`../…`)
      // that resolves inside `src/` becomes `@/…` (mirrors tsconfig `paths` +
      // the vite / tsc-alias config).
      'local/prefer-alias': 'error',
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
      "@typescript-eslint/no-unused-vars": 'off', // handled by TypeScript compiler
      "@typescript-eslint/no-empty-object-type": 'off', // TODO: Remove
      "@typescript-eslint/no-unsafe-function-type": 'off', // TODO: Remove
      "@typescript-eslint/no-explicit-any": 'off', // TODO: Remove
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

  // Cypress test files
  {
    files: ['cypress/**/*.ts', 'cypress/**/*.tsx'],
    plugins: {
      cypress: cypressPlugin,
    },
    languageOptions: {
      globals: {
        cy: 'readonly',
        Cypress: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        beforeEach: 'readonly',
        after: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
      },
    },
    rules: {
      ...cypressPlugin.configs.recommended.rules,
      // Custom Cypress commands are legitimately chained after built-in commands;
      // the rule gives false positives for prevSubject:true custom commands.
      'cypress/unsafe-to-chain-command': 'warn',
    },
  },

  // Prettier config (must be last to override other formatting rules)
  prettierConfig,
);
