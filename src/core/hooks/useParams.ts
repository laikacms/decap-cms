import { useDecap } from './useDecap';

import type { RoutingTable } from '../routing/table';

/**
 * Read the current route's params for `key`. Only valid when the current
 * location is on that route (the caller renders under it); otherwise the
 * underlying table `get` throws.
 */
export const useParams = <T extends keyof RoutingTable>(
  key: T,
): ReturnType<RoutingTable[T]['get']> => {
  const { params } = useDecap();
  return params(key) as ReturnType<RoutingTable[T]['get']>;
};
