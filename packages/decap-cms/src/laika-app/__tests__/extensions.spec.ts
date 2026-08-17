import { describe, expect, it } from 'vitest';

import { getBackend, getWidget } from '@/core/lib/registry';
import { registerExtensions } from '@/laika-app/extensions';

describe('laika-app extensions', () => {
  it('registers the laika backend alongside the other built-in backends (DCMS-1221)', () => {
    registerExtensions();

    // The default `/laika-app` bundle (`laika-cms.js`) is what LaikaCMS's own
    // quickstart config (`backend: { name: laika, ... }`) loads. If `laika`
    // is missing from the Registry, `init()` crashes at boot with
    // "Backend not found: laika" before any user code can run.
    for (const name of [
      'git-gateway',
      'azure',
      'aws-cognito-github-proxy',
      'github',
      'gitlab',
      'gitea',
      'forgejo',
      'bitbucket',
      'test-repo',
      'proxy',
      'laika',
    ]) {
      expect(getBackend(name)).toBeDefined();
    }
  });

  it('does not register the map widget by default (DCMS-1971)', () => {
    registerExtensions();

    // The map widget ships as the standalone `@laikacms/decap-cms-widget-map`
    // package (extensions/widgets/map). Consumers who need it opt in via
    // `CMS.registerWidget(DecapCmsWidgetMap.Widget())`.
    expect(getWidget('map')).toBeUndefined();
  });
});
