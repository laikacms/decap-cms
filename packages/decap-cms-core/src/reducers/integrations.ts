import { CONFIG_SUCCESS } from '../actions/config';

import type { ConfigAction } from '../actions/config';
import type { Integrations, CmsConfig } from '../types/redux';

export function getIntegrations(config: CmsConfig): Integrations {
  const integrations = config.integrations || [];
  return integrations.reduce(
    (acc, integration) => {
      const { hooks, collections, provider, ...providerData } = integration;
      acc.providers[provider] = { ...providerData };
      if (!collections) {
        hooks.forEach(hook => {
          acc.hooks[hook] = provider;
        });
        return acc;
      }
      const integrationCollections =
        collections === '*' ? config.collections.map(collection => collection.name) : collections;
      integrationCollections.forEach(collection => {
        hooks.forEach(hook => {
          acc.hooks[collection]
            ? ((acc.hooks[collection] as Record<string, string>)[hook] = provider)
            : (acc.hooks[collection] = { [hook]: provider });
        });
      });
      return acc;
    },
    { providers: {}, hooks: {} } as Integrations,
  );
}

const defaultState: Integrations = { providers: {}, hooks: {} };

function integrations(state = defaultState, action: ConfigAction): Integrations {
  switch (action.type) {
    case CONFIG_SUCCESS: {
      return getIntegrations(action.payload);
    }
    default:
      return state;
  }
}

export function selectIntegration(
  state: Integrations,
  collection: string | null,
  hook: string,
): string | false {
  const hooks = state?.hooks;
  if (!hooks) return false;
  if (collection) {
    const collectionHooks = hooks[collection];
    if (collectionHooks && typeof collectionHooks === 'object') {
      const value = collectionHooks[hook];
      return typeof value === 'string' ? value : false;
    }
    return false;
  }
  const value = hooks[hook];
  return typeof value === 'string' ? value : false;
}

export default integrations;
