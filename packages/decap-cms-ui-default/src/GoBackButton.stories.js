import React from 'react';

import GoBackButton from './GoBackButton';

function t(key) {
  const dictionary = {
    'ui.default.goBackToSite': 'Go back to site',
  };
  return dictionary[key] || key;
}

function GoBack() {
  return <GoBackButton href="https://example.com" t={t} />;
}

export default {
  title: 'UI/GoBackButton',
  component: GoBackButton,
};

export const Default = {
  render: GoBack,
};
