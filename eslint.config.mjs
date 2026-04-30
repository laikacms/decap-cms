import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
// They have not yet upgraded to ESLint v10
// import reactPlugin from 'eslint-plugin-react';
import cypressPlugin from 'eslint-plugin-cypress';
// They have not yet upgraded to ESLint v10
// import importPlugin from 'eslint-plugin-import';
import unicornPlugin from 'eslint-plugin-unicorn';
import prettierConfig from 'eslint-config-prettier';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const emotionPlugin = require('@emotion/eslint-plugin');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const packages = fs
  .readdirSync(path.join(__dirname, 'packages'), { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

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
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Main configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
    plugins: {
      // react: reactPlugin,
      // TODO: re-enable when they upgrade to ESLint v10
      // import: importPlugin,
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
        version: 'detect',
      },
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx'],
        },
        typescript: {
          alwaysTryTypes: true,
        },
        exports: {},
      },
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
      // TODO: re-enable when they upgrade to ESLint v10
      // 'react/prop-types': 'off',
      // 'react/no-unknown-property': [
      //   'error',
      //   { ignore: ['css', 'bold', 'italic', 'delete', 'strikethrough'] },
      // ],

      // Import rules
      // TODO: re-enable when they upgrade to ESLint v10
      // 'import/no-named-as-default': 'off',
      // 'import/order': [
      //   'error',
      //   {
      //     'newlines-between': 'always',
      //     groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index'], ['type']],
      //   },
      // ],

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
