module.exports = {
  stories: ['../packages/decap-cms-ui-default/src/**/*.stories.js'],
  addons: [
    '@storybook/addon-webpack5-compiler-babel',
    '@storybook/addon-actions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  // Inline `*.svg` imports as React components (as the ESM build does), so the
  // Icon component can render them via `<IconSvg />`.
  babel: async options => {
    options.plugins = options.plugins || [];
    options.plugins.push([
      'inline-react-svg',
      {
        svgo: {
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false,
                },
              },
            },
          ],
        },
      },
    ]);
    return options;
  },
};
