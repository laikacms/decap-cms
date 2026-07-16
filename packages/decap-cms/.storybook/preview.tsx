import { css, Global } from '@emotion/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { laikaDarkTheme, laikaLightTheme } from '../src/laika-app/laikaThemes';
import { GlobalStyles, themeToCssVars } from '../src/ui/default/index';

import type { Preview } from '@storybook/react';

/**
 * Storybook preview wrapper. Mounts the same global styles + theme-variable
 * emission that LaikaThemeProvider would, but driven by the Storybook
 * "background" toolbar control so each story can be inspected in light + dark.
 */

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#eff0f4' },
        { name: 'dark', value: '#11141a' },
      ],
    },
    controls: { expanded: true },
  },
  globalTypes: {
    laikaTheme: {
      name: 'Laika theme',
      description: 'Which laika theme variables to emit',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const mode = context.globals.laikaTheme as 'light' | 'dark';
      const theme = mode === 'dark' ? laikaDarkTheme : laikaLightTheme;
      const shadowVars = mode === 'dark'
        ? css`
              :root {
                --laika-shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.45);
                --laika-shadow-strong: 0 12px 32px rgba(0, 0, 0, 0.55);
                --laika-shadow-overlay: rgba(0, 0, 0, 0.65);
              }
            `
        : css`
              :root {
                --laika-shadow-soft: 0 6px 18px rgba(15, 23, 42, 0.08);
                --laika-shadow-strong: 0 24px 64px rgba(15, 23, 42, 0.12);
                --laika-shadow-overlay: rgba(15, 23, 42, 0.5);
              }
            `;

      return (
        <MemoryRouter>
          <GlobalStyles />
          <Global styles={{ ':root': themeToCssVars(theme) }} />
          <Global styles={shadowVars} />
          <div style={{ padding: 24 }}>
            <Story />
          </div>
        </MemoryRouter>
      );
    },
  ],
};

export default preview;
