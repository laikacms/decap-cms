import { GlobalStyles } from '../src/ui-default/styles';

import type { Decorator, Preview } from '@storybook/react';

const withGlobalStyles: Decorator = Story => (
  <>
    <GlobalStyles />
    <div style={{ padding: '2rem' }}>
      <Story />
    </div>
  </>
);

const preview: Preview = {
  decorators: [withGlobalStyles],
};

export default preview;
