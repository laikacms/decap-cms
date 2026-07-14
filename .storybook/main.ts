import { readFileSync } from 'fs';
import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin as EsbuildPlugin } from 'esbuild';

/**
 * `@vitejs/plugin-react` v6 dropped Babel (it runs on OXC), so `@emotion/babel-plugin`
 * can't run. Without it, the *development* build of `@emotion/styled` returns the
 * `NO_COMPONENT_SELECTOR` sentinel from `toString()`, and `@emotion/serialize` throws when
 * a styled component is used as a selector (e.g. `${Icon}` in `ObjectWidgetTopBar`, or
 * `${Bubble}` in `LaikaTooltip`).
 * Patching `isDevelopment` to `false` makes `toString()` return `".undefined"` instead of
 * throwing. Mirrors the equivalent plugin in `vitest.config.ts`.
 *
 * The `isDevelopment` flag isn't only set in an `@emotion/styled` chunk: `@emotion/react`'s
 * own dev build declares it too, in a helper file whose name is hashed per-release (e.g.
 * `emotion-element-<hash>.browser.development.esm.js`). Matching on file content
 * (`var isDevelopment = true;`) instead of a specific filename substring catches every
 * emotion dev chunk that needs the patch, regardless of which package or hash it ships in.
 */
const emotionStyledProductionPlugin = {
  name: 'emotion-styled-base-production',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (id.includes('@emotion') && code.includes('var isDevelopment = true;')) {
      return code.replace('var isDevelopment = true;', 'var isDevelopment = false;');
    }
  },
};

/**
 * Storybook's Vite pipeline pre-bundles `node_modules` deps with esbuild *before* Vite's
 * own `transform` hooks (including `emotionStyledProductionPlugin` above) ever run. By the
 * time a source module reaches Vite's transform pipeline, the emotion dev chunk that
 * declares `isDevelopment` has already been folded into an esbuild dep chunk (e.g.
 * `emotion-element-<hash>.browser.development.esm-*.js`), so the plain Rollup/Vite plugin
 * never sees it and the `NO_COMPONENT_SELECTOR` crash survives. Registering the same
 * `isDevelopment` patch as an esbuild `onLoad` plugin applies it during that pre-bundle pass
 * instead, so the fix survives a clean `node_modules/.cache` wipe (unlike patching the
 * cached pre-bundle output directly). The filter matches any `@emotion/*` dev build file
 * (not just `emotion-styled-base`), since `@emotion/react`'s dev build declares the same
 * flag in a differently-named, per-release-hashed file.
 */
const emotionStyledProductionEsbuildPlugin: EsbuildPlugin = {
  name: 'emotion-styled-base-production-esbuild',
  setup(build) {
    build.onLoad({ filter: /[/\\]@emotion[/\\].*\.development\./ }, args => {
      const original = readFileSync(args.path, 'utf8');
      if (!original.includes('var isDevelopment = true;')) {
        return;
      }
      const contents = original.replace(
        'var isDevelopment = true;',
        'var isDevelopment = false;',
      );
      return { contents, loader: 'js' };
    });
  },
};

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // Storybook 10 ships what used to be `@storybook/addon-essentials`
  // (controls, viewport, backgrounds, …) inside the core package, so only
  // `@storybook/addon-a11y` needs to be registered explicitly for
  // accessibility checks.
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen',
  },
  // Same vite tweaks the demo IIFE bundle uses, so styled components +
  // path-browserify resolve correctly inside Storybook.
  viteFinal: async config => {
    const { mergeConfig } = await import('vite');
    config.resolve = config.resolve ?? {};
    (config.resolve as { alias?: Record<string, string> }).alias = {
      ...((config.resolve as { alias?: Record<string, string> }).alias ?? {}),
      path: 'path-browserify',
      buffer: 'buffer',
    };
    config.define = {
      ...(config.define ?? {}),
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env': '{}',
      global: 'globalThis',
      DECAP_CMS_APP_VERSION: JSON.stringify('storybook'),
      DECAP_CMS_CORE_VERSION: JSON.stringify('storybook'),
      DECAP_CMS_VERSION: JSON.stringify('storybook'),
    };
    return mergeConfig(config, {
      plugins: [emotionStyledProductionPlugin],
      optimizeDeps: {
        esbuildOptions: {
          plugins: [emotionStyledProductionEsbuildPlugin],
        },
      },
    });
  },
};

export default config;
