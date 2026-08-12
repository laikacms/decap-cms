import Algolia from './providers/algolia/implementation';
import AssetStore from './providers/assetStore/implementation';

import type { AlgoliaConfig } from './providers/algolia/implementation';
import type { AssetStoreConfig } from './providers/assetStore/implementation';

// Integrations config is a plain object.

type Integrations = any;

// Matches `BackendImplementation.getToken` (`@/lib/backend/implementation`),
// which callers pass in directly (e.g. `backend.getToken`); the token can be
// `null` when the backend has no live session.
export type GetTokenFn = () => Promise<string | null>;

type IntegrationProvider = Algolia | AssetStore;

type IntegrationInstances = globalThis.Map<string, IntegrationProvider>;

export function resolveIntegrations(
  integrationsConfig: Integrations,
  getToken: GetTokenFn,
): IntegrationInstances {
  const integrationInstances: IntegrationInstances = new globalThis.Map();
  const providers = integrationsConfig?.providers as
    | Record<string, AlgoliaConfig | AssetStoreConfig>
    | undefined;
  if (providers) {
    Object.entries(providers).forEach(
      ([providerName, providerData]: [string, AlgoliaConfig | AssetStoreConfig]) => {
        switch (providerName) {
          case 'algolia':
            integrationInstances.set('algolia', new Algolia(providerData as AlgoliaConfig));
            break;
          case 'assetStore':
            integrationInstances.set(
              'assetStore',
              new AssetStore(providerData as AssetStoreConfig, getToken),
            );
            break;
        }
      },
    );
  }
  return integrationInstances;
}

export const getIntegrationProvider = (function() {
  let integrations: IntegrationInstances | null = null;

  return (
    integrationsConfig: Integrations,
    getToken: GetTokenFn,
    provider: string,
  ): IntegrationProvider | undefined => {
    if (integrations) {
      return integrations.get(provider);
    } else {
      integrations = resolveIntegrations(integrationsConfig, getToken);
      return integrations.get(provider);
    }
  };
})();
