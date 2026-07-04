import { useContext } from 'react';

import { context } from '../contexts/decap';

import type { DecapCmsContext } from '../contexts/decap';

/**
 * Read the Decap routing/config context. Throws when rendered outside a
 * `DecapCmsProvider`. The value is already memoized by the provider, so it is
 * returned as-is.
 */
export const useDecap = (): DecapCmsContext => {
  const decap = useContext(context);
  if (!decap) {
    throw new Error('useDecap must be used within a DecapCmsProvider');
  }
  return decap;
};
