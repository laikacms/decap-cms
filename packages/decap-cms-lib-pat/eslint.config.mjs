import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import path from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plain Node/TS package (no React/JSX, no bundler aliasing), so this mirrors
// only the parts of packages/decap-cms/eslint.config.mjs that apply here.
export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
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
      ],
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2026,
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'object-shorthand': ['error', 'always'],
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-duplicate-imports': 'off', // handled by @typescript-eslint
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // handled by TypeScript compiler
    },
  },
  prettierConfig,
);
