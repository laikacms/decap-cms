import { readFileSync } from 'fs';
import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin as EsbuildPlugin } from 'esbuild';

/**
 * `@vitejs/plugin-react` v6 dropped Babel (it runs on OXC), so `@emotion/babel-plugin`
 * can't run. Without it, the *development* build of `@emotion/styled` returns the
 * `NO_COMPONENT_SELECTOR` sentinel from `toString()`, and `@emotion/serialize` throws when
 * a styled component is used as a selector (e.g. `${Icon}` in `ObjectWidgetTopBar`, or
 * `${Bubble}` in `LaikaTooltip`). Patching `isDevelopment` to `false` makes `toString()`
 * return `".undefined"` instead of throwing. Mirrors the equivalent plugin in
 * `vitest.config.ts`.
 *
 * The `isDevelopment` flag this needs to patch isn't confined to `@emotion/styled`'s own
 * `emotion-styled-base.development.*` file: esbuild's dep pre-bundler inlines several
 * `@emotion/*` dev builds (`@emotion/serialize`, `@emotion/react`'s `emotion-element-<hash>
 * .browser.development.esm-<hash>.js`, etc.) into shared chunks, and any of them can carry
 * its own copy of the flag depending on how the bundler happens to split things. Matching a
 * single filename substring (e.g. `emotion-styled-base` or `emotion-element`) is brittle
 * because it breaks again the next time the chunk split/hash changes. Match on *content*
 * instead — any `@emotion/*` dev-build file containing `var isDevelopment = true;` — so the
 * patch keeps working regardless of which chunk esbuild produces.
 */
const isEmotionDevSource = (id: string) => id.includes('@emotion') && id.includes('.development.');
const patchEmotionIsDevelopment = (code: string) =>
  code.includes('var isDevelopment = true;')
    ? code.replace('var isDevelopment = true;', 'var isDevelopment = false;')
    : undefined;

const emotionStyledProductionPlugin = {
  name: 'emotion-styled-base-production',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (isEmotionDevSource(id)) {
      return patchEmotionIsDevelopment(code);
    }
  },
};

/**
 * Storybook's Vite pipeline pre-bundles `node_modules` deps with esbuild *before* Vite's
 * own `transform` hooks (including `emotionStyledProductionPlugin` above) ever run, so by
 * the time a module reaches Vite's transform pipeline it may already be folded into an
 * esbuild dep chunk the plain Rollup/Vite plugin never sees, and the `NO_COMPONENT_SELECTOR`
 * crash survives. Registering the same `isDevelopment` patch as an esbuild `onLoad` plugin
 * applies it during that pre-bundle pass instead, so the fix survives a clean
 * `node_modules/.cache` wipe (unlike patching the cached pre-bundle output directly). The
 * `onLoad` filter is intentionally broad (any `@emotion/*` dev-build file) with the real
 * gate being the content check in `patchEmotionIsDevelopment`, so it keeps working across
 * `@emotion/serialize`, `@emotion/react`, and `@emotion/styled` dev builds alike.
 */
const emotionStyledProductionEsbuildPlugin: EsbuildPlugin = {
  name: 'emotion-styled-base-production-esbuild',
  setup(build) {
    build.onLoad({ filter: /@emotion[\\/].*\.development\./ }, args => {
      const contents = patchEmotionIsDevelopment(readFileSync(args.path, 'utf8'));
      return contents === undefined ? undefined : { contents, loader: 'js' };
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
