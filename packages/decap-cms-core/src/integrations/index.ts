import { Map } from 'immutable';

import Algolia, { AlgoliaConfig } from './providers/algolia/implementation';
import AssetStore, { AssetStoreConfig } from './providers/assetStore/implementation';

import type { Integrations } from '../types/cms';

type GetTokenFn = () => Promise<string>;

type IntegrationProvider = Algolia | AssetStore;

type IntegrationInstances = Map<string, IntegrationProvider>;

export function resolveIntegrations(
  integrationsConfig: Integrations,
  getToken: GetTokenFn,
): IntegrationInstances {
  let integrationInstances: IntegrationInstances = Map({});
  const providers = integrationsConfig.getIn(['providers']) as
    | Map<string, AlgoliaConfig | AssetStoreConfig>
    | undefined;
  if (providers) {
    providers.forEach(
      (providerData: AlgoliaConfig | AssetStoreConfig, providerName: string) => {
        switch (providerName) {
          case 'algolia':
            integrationInstances = integrationInstances.set(
              'algolia',
              new Algolia(providerData as AlgoliaConfig),
            );
            break;
          case 'assetStore':
            integrationInstances = integrationInstances.set(
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

export const getIntegrationProvider = (function () {
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
