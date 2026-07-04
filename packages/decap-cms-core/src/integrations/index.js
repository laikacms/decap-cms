import Algolia from './providers/algolia/implementation';
import AssetStore from './providers/assetStore/implementation';

export function resolveIntegrations(integrationsConfig, getToken) {
  const integrationInstances = {};
  const providers = integrationsConfig.providers || {};
  Object.entries(providers).forEach(([providerName, providerData]) => {
    switch (providerName) {
      case 'algolia':
        integrationInstances.algolia = new Algolia(providerData);
        break;
      case 'assetStore':
        integrationInstances.assetStore = new AssetStore(providerData, getToken);
        break;
    }
  });
  return integrationInstances;
}

export const getIntegrationProvider = (function () {
  let integrations = null;

  return (integrationsConfig, getToken, provider) => {
    if (integrations) {
      return integrations[provider];
    } else {
      integrations = resolveIntegrations(integrationsConfig, getToken);
      return integrations[provider];
    }
  };
})();
