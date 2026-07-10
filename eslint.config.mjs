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
        { ignore: ['css', 'bold', 'italic', 'delete', 'strikethrough'] },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import rules
      'import/no-named-as-default': 'off',
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index'], ['type']],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'immutable',
              message:
                'Immutable.js is intentionally not used in this codebase. Use plain objects/arrays with the spread operator and optional chaining instead.',
            },
          ],
          patterns: [
            {
              group: ['immutable/*'],
              message:
                'Immutable.js is intentionally not used in this codebase. Use plain objects/arrays with the spread operator and optional chaining instead.',
            },
          ],
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
