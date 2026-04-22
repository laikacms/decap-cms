import { produce } from 'immer';

import { CONFIG_SUCCESS } from '../actions/config';

import type { ConfigAction } from '../actions/config';
import type { CmsConfig } from 'decap-cms-lib-util/types/cms';

type Integrations = {
  hooks: { [collectionOrHook: string]: any };
  providers?: Record<string, unknown>;
};

interface Acc {
  providers: Record<string, {}>;
  hooks: Record<string, string | Record<string, string>>;
}

export function getIntegrations(config: CmsConfig): Integrations {
  const integrations = config.integrations || [];
  return integrations.reduce(
    (acc, integration) => {
      const { hooks, collections, provider, ...providerData } = integration;
      acc.providers![provider] = { ...providerData };
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
          if (acc.hooks[collection]) {
            (acc.hooks[collection] as Record<string, string>)[hook] = provider;
          } else {
            acc.hooks[collection] = { [hook]: provider };
          }
        });
      });
      return acc;
    },
    { providers: {}, hooks: {} } as Integrations,
  );
}

const defaultState: Integrations = { providers: {}, hooks: {} };

const integrations = produce((state: Integrations, action: ConfigAction) => {
  switch (action.type) {
    case CONFIG_SUCCESS:
      return getIntegrations(action.payload);
  }
}, defaultState);

export function selectIntegration(
  state: Integrations,
  collection: string | null,
  hook: string,
): string | false {
  if (collection) {
    const collectionHooks = state.hooks[collection] as Record<string, string> | undefined;
    return collectionHooks?.[hook] ?? false;
  }
  return (state.hooks[hook] as string | undefined) ?? false;
}

export default integrations;
