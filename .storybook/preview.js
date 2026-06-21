import React from 'react';

import { GlobalStyles } from '../packages/decap-cms-ui-default/src/styles';

function withGlobalStyles(Story) {
  return (
    <>
      <GlobalStyles />
      <div style={{ padding: '2rem' }}>
        <Story />
      </div>
    </>
  );
}

export const decorators = [withGlobalStyles];
