import { readFileSync } from 'fs';
import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin as EsbuildPlugin } from 'esbuild';

/**
 * `@vitejs/plugin-react` v6 dropped Babel (it runs on OXC), so `@emotion/babel-plugin`
 * can't run. Without it, the *development* build of `@emotion/styled` returns the
 * `NO_COMPONENT_SELECTOR` sentinel from `toString()`, and `@emotion/serialize` throws when
 * a styled component is used as a selector (e.g. `${Icon}` in `ObjectWidgetTopBar`).
 * Patching `isDevelopment` to `false` makes `toString()` return `".undefined"` instead of
 * throwing. Mirrors the equivalent plugin in `vitest.config.ts`.
 */
const emotionStyledProductionPlugin = {
  name: 'emotion-styled-base-production',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (id.includes('emotion-styled-base') && id.includes('.development.')) {
      return code.replace('var isDevelopment = true;', 'var isDevelopment = false;');
    }
  },
};

/**
 * Storybook's Vite pipeline pre-bundles `node_modules` deps with esbuild *before* Vite's
 * own `transform` hooks (including `emotionStyledProductionPlugin` above) ever run. By the
 * time a source module reaches Vite's transform pipeline, `emotion-styled-base`'s dev build
 * has already been folded into an esbuild dep chunk (e.g.
 * `emotion-element-<hash>.browser.development.esm-*.js`), so the plain Rollup/Vite plugin
 * never sees it and the `NO_COMPONENT_SELECTOR` crash survives. Registering the same
 * `isDevelopment` patch as an esbuild `onLoad` plugin applies it during that pre-bundle pass
 * instead, so the fix survives a clean `node_modules/.cache` wipe (unlike patching the
 * cached pre-bundle output directly).
 */
const emotionStyledProductionEsbuildPlugin: EsbuildPlugin = {
  name: 'emotion-styled-base-production-esbuild',
  setup(build) {
    build.onLoad({ filter: /emotion-styled-base.*\.development\./ }, args => {
      const contents = readFileSync(args.path, 'utf8').replace(
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
  // (controls, viewport, backgrounds, …) inside the core package, so no
  // addons are needed here. Add `@storybook/addon-a11y@^10` later if
  // accessibility checks become a goal.
  addons: [],
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
