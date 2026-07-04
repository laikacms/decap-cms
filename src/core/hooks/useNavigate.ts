import { useDecap } from './useDecap';

import type { DecapNavigate } from '../contexts/decap';

/**
 * Returns the context `navigate(key, params?, options?)` function. Stable
 * across renders as long as the underlying routing implementation is.
 */
export const useNavigate = (): DecapNavigate => {
  const { navigate } = useDecap();
  return navigate;
};
