import React from 'react';

import Loader from './Loader';

function SingleMessageLoader() {
  return (
    <div style={{ position: 'relative', height: '200px' }}>
      <Loader active>Loading entries…</Loader>
    </div>
  );
}

function RotatingMessagesLoader() {
  return (
    <div style={{ position: 'relative', height: '200px' }}>
      <Loader active>
        {['Loading entries…', 'This might take a few seconds', 'Almost there…']}
      </Loader>
    </div>
  );
}

export default {
  title: 'UI/Loader',
  component: Loader,
};

export const SingleMessage = {
  render: SingleMessageLoader,
};

export const RotatingMessages = {
  render: RotatingMessagesLoader,
};
