import { useMemo } from 'react';

import { resolveUserScopes } from '@/core/lib/collectionAccess';
import { useAppSelector } from './useRedux';

export function useCurrentUserScopes(): string[] {
  const user = useAppSelector(state => state.auth?.user);
  const roles = useAppSelector(state => state.config?.roles);
  return useMemo(() => resolveUserScopes(user, roles), [user, roles]);
}
