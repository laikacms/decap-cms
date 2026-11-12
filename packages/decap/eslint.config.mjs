// ESLint for @decap/cli: the general rules of packages/decap-cms/eslint.config.mjs
// (recommended + typescript-eslint, import order, type imports, no em dashes),
// without the React, Emotion and component-layering rules that only make
// sense for the CMS sources.
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importPlugin from 'eslint-plugin-import-x';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EM_DASH_MESSAGE = 'No em dashes: use a hyphen, comma, or reword.';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/\\u2014/]', message: EM_DASH_MESSAGE },
        { selector: 'TemplateElement[value.raw=/\\u2014/]', message: EM_DASH_MESSAGE },
      ],
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mjs'],
    plugins: {
      import: importPlugin,
      unicorn: unicornPlugin,
    },
    languageOptions: {
      ecmaVersion: 2026,
      sourceType: 'module',
      parserOptions: { tsconfigRootDir: __dirname },
      globals: {
        ...globals.node,
        DECAP_CLI_VERSION: 'readonly',
      },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: path.join(__dirname, 'tsconfig.json'),
        }),
      ],
    },
    rules: {
      'no-console': 'off',
      'object-shorthand': ['error', 'always'],
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-duplicate-imports': 'off',
      'import/no-named-as-default': 'off',
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index'], ['type']],
        },
      ],
      // The tsconfig maps `@/*` into decap-cms/src only so the dev-server
      // sources bundled into `decap dev` resolve their own alias. The CLI
      // reaches decap-cms through `decap-cms/dev-server` and nothing else.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/*'], message: 'The @/ alias belongs to decap-cms; import decap-cms/dev-server instead.' },
            { group: ['**/decap-cms/src/**'], message: 'Import decap-cms/dev-server instead of decap-cms sources.' },
          ],
        },
      ],
      'unicorn/prefer-string-slice': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'off', // handled by TypeScript (noUnusedLocals)
    },
  },
  prettierConfig,
);
