import type { StorybookConfig } from '@storybook/react-vite';

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

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import('vite');
    return mergeConfig(viteConfig, {
      plugins: [emotionStyledProductionPlugin],
    });
  },
};

export default config;
