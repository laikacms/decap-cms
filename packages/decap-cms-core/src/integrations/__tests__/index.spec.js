import { fromJS } from 'immutable';

import { resolveIntegrations } from '../index';
import Algolia from '../providers/algolia/implementation';
import AssetStore from '../providers/assetStore/implementation';

describe('integrations', () => {
  describe('resolveIntegrations', () => {
    it('returns a Map with an algolia entry when configured', () => {
      const integrationsConfig = fromJS({
        providers: {
          algolia: { applicationID: 'app-id', apiKey: 'api-key' },
        },
      });

      const integrations = resolveIntegrations(integrationsConfig, jest.fn());

      expect(integrations.get('algolia')).toBeInstanceOf(Algolia);
    });

    it('returns a Map with an assetStore entry when configured', () => {
      const integrationsConfig = fromJS({
        providers: {
          assetStore: { getSignedFormURL: 'https://example.com/sign' },
        },
      });
      const getToken = jest.fn();

      const integrations = resolveIntegrations(integrationsConfig, getToken);

      expect(integrations.get('assetStore')).toBeInstanceOf(AssetStore);
    });

    it('does not add an entry for an unrecognized provider name', () => {
      const integrationsConfig = fromJS({
        providers: {
          unknownProvider: { foo: 'bar' },
        },
      });

      const integrations = resolveIntegrations(integrationsConfig, jest.fn());

      expect(integrations.has('unknownProvider')).toBe(false);
      expect(integrations.isEmpty()).toBe(true);
    });
  });

  describe('getIntegrationProvider', () => {
    it('memoizes the resolved integrations map and ignores args on later calls', () => {
      // The module under test memoizes `integrations` in a module-level
      // closure the first time it is invoked, so we isolate the module
      // registry here to guarantee a clean first call within this test,
      // requiring both the module under test and its Algolia dependency
      // from the same isolated registry so `instanceof` checks work.
      let freshGetIntegrationProvider;
      let IsolatedAlgolia;
      jest.isolateModules(() => {
        // eslint-disable-next-line global-require
        freshGetIntegrationProvider = require('../index').getIntegrationProvider;
        // eslint-disable-next-line global-require
        IsolatedAlgolia = require('../providers/algolia/implementation').default;
      });

      const firstConfig = fromJS({
        providers: {
          algolia: { applicationID: 'app-id', apiKey: 'api-key' },
        },
      });
      const firstGetToken = jest.fn();

      const firstResult = freshGetIntegrationProvider(firstConfig, firstGetToken, 'algolia');
      expect(firstResult).toBeInstanceOf(IsolatedAlgolia);

      const secondConfig = fromJS({
        providers: {
          assetStore: { getSignedFormURL: 'https://example.com/sign' },
        },
      });
      const secondGetToken = jest.fn();

      const secondResult = freshGetIntegrationProvider(secondConfig, secondGetToken, 'algolia');

      // Second call is served from the memoized map, regardless of the
      // different config/getToken passed in, so it returns the SAME
      // cached algolia instance rather than resolving assetStore.
      expect(secondResult).toBe(firstResult);
      expect(
        freshGetIntegrationProvider(secondConfig, secondGetToken, 'assetStore'),
      ).toBeUndefined();
    });
  });
});
