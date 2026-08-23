import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { GlobalStyles } from '../src/ui/default/index';

import type { Preview } from '@storybook/react';

/**
 * Storybook preview wrapper. Mounts the same global styles the app shell does,
 * inside a memory router so routed components render standalone. Use the
 * "background" toolbar control to inspect a story light and dark.
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
  decorators: [
    Story => (
      <MemoryRouter>
        <GlobalStyles />
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default preview;
