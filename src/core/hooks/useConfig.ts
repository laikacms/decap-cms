import { useAppSelector } from './useRedux';
import { EDITORIAL_WORKFLOW, SIMPLE } from '@/core/constants/publishModes';

/**
 * Hook for accessing CMS configuration
 * Replaces connect() mapStateToProps for config
 */
export function useConfig() {
  const config = useAppSelector(state => state.config);

  const publishMode = config?.publish_mode;
  const hasWorkflow = publishMode === EDITORIAL_WORKFLOW;
  const isSimpleWorkflow = publishMode === SIMPLE;

  return {
    config,
    isLoading: config?.isFetching ?? true,
    hasError: !!config?.error,
    error: config?.error,
    publishMode,
    hasWorkflow,
    isSimpleWorkflow,
    displayUrl: config?.display_url,
    logoUrl: config?.logo_url,
    logo: config?.logo,
    backend: config?.backend,
    isTestRepo: config?.backend?.name === 'test-repo',
  };
}
