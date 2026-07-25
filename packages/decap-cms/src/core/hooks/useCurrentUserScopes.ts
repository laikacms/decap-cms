import { useAppSelector } from './useRedux';

export function useCurrentUserScopes(): string[] {
  return useAppSelector(state => state.auth?.user?.scopes ?? []);
}
