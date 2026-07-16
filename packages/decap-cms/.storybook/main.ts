import type { StorybookConfig } from '@storybook/react-vite';

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
  viteFinal: async config => {
    config.resolve = config.resolve ?? {};
    (config.resolve as { alias?: Record<string, string> }).alias = {
      ...((config.resolve as { alias?: Record<string, string> }).alias ?? {}),
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
    return config;
  },
};

export default config;
