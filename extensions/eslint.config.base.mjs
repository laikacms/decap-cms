import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Shared flat config for every package under `extensions/`.
 *
 * These packages exist to prove the published extension surface is sufficient:
 * they are written the way a third-party author has to write one. The
 * import-boundary rule below is what keeps that honest. Without it, the first
 * shortcut back into `packages/decap-cms/src` turns these into ordinary
 * in-repo folders that happen to live elsewhere, and the exercise stops
 * testing anything.
 *
 * Anything an extension needs and cannot reach through a published subpath is
 * a gap in `decap-cms`'s `exports` map, and the fix belongs there,
 * not here.
 *
 * `extensions/` is not itself a package, so this file cannot resolve eslint
 * plugins from its own location. Each package passes them in from its own
 * node_modules instead; the rules stay defined once, here.
 */
export default function extensionConfig({ configUrl, eslint, tseslint, globals, prettierConfig }) {
  const dirname = path.dirname(fileURLToPath(configUrl));

  return tseslint.config(
    {
      ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.mjs'],
      languageOptions: {
        ecmaVersion: 2026,
        sourceType: 'module',
        parserOptions: {
          tsconfigRootDir: dirname,
          ecmaFeatures: { jsx: true },
        },
        globals: {
          ...globals.browser,
        },
      },
      rules: {
        'object-shorthand': ['error', 'always'],
        'prefer-const': ['error', { destructuring: 'all' }],
        'no-duplicate-imports': 'off', // handled by @typescript-eslint
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': 'off', // handled by TypeScript compiler
        // Matches packages/decap-cms, whose test doubles lean on `any`. Tightening
        // this is a separate cleanup, not something to fork policy over here.
        '@typescript-eslint/no-explicit-any': 'off',
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
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/*'],
                message:
                  "Extension packages cannot use the CMS package's internal `@/` alias. Import from a published subpath, e.g. `decap-cms/lib/util`.",
              },
              {
                group: ['decap-cms/src/*', 'decap-cms/dist/*'],
                message:
                  'Import the published subpath (`decap-cms/<name>`), not a path inside the package. If what you need has no subpath, add one to its `exports` map.',
              },
              {
                group: ['**/packages/decap-cms/**'],
                message:
                  'Extension packages cannot reach into the CMS package directory. Import from a published subpath instead.',
              },
            ],
          },
        ],
      },
    },
    prettierConfig,
  );
}
