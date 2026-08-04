import '../test-setup.js';

import { renderHandshakeHtml } from '../html';

describe('renderHandshakeHtml', () => {
  it('produces a page that posts the documented decap-cms-lib-auth handshake message', () => {
    // eslint-disable-next-line no-new-func -- executing the rendered <script> body is the only
    // way to assert it actually posts the message decap-cms-lib-auth's NetlifyAuthenticator expects.
    const runScript = new Function(
      'window',
      renderHandshakeHtml('github', 'https://cms.example.com', 'success', { token: 'tok_123' })
        .replace(/^[\s\S]*<script>/, '')
        .replace(/<\/script>[\s\S]*$/, ''),
    );

    const posted: Array<[string, string]> = [];
    const listeners: Array<(e: { origin: string; data: string }) => void> = [];
    const fakeWindow = {
      opener: {
        postMessage: (data: string, targetOrigin: string) => posted.push([data, targetOrigin]),
      },
      addEventListener: (
        _type: string,
        listener: (e: { origin: string; data: string }) => void,
      ) => {
        listeners.push(listener);
      },
      removeEventListener: () => undefined,
    };

    runScript(fakeWindow);
    expect(posted).toEqual([['authorizing:github', 'https://cms.example.com']]);

    // Simulate the opener echoing the handshake back, as decap-cms-lib-auth's
    // handshakeCallback does.
    listeners[0]({ origin: 'https://cms.example.com', data: 'authorizing:github' });

    expect(posted[1]).toEqual([
      'authorization:github:success:' + JSON.stringify({ token: 'tok_123' }),
      'https://cms.example.com',
    ]);
  });

  it('ignores echoes from an unexpected origin', () => {
    // eslint-disable-next-line no-new-func
    const runScript = new Function(
      'window',
      renderHandshakeHtml('github', 'https://cms.example.com', 'success', { token: 'tok_123' })
        .replace(/^[\s\S]*<script>/, '')
        .replace(/<\/script>[\s\S]*$/, ''),
    );

    const posted: Array<[string, string]> = [];
    const listeners: Array<(e: { origin: string; data: string }) => void> = [];
    const fakeWindow = {
      opener: {
        postMessage: (data: string, targetOrigin: string) => posted.push([data, targetOrigin]),
      },
      addEventListener: (
        _type: string,
        listener: (e: { origin: string; data: string }) => void,
      ) => {
        listeners.push(listener);
      },
      removeEventListener: () => undefined,
    };

    runScript(fakeWindow);
    listeners[0]({ origin: 'https://evil.example.com', data: 'authorizing:github' });

    expect(posted).toHaveLength(1);
  });

  it('escapes </script> in untrusted payload values', () => {
    const html = renderHandshakeHtml('github', 'https://cms.example.com', 'error', {
      message: '</script><script>alert(1)</script>',
    });
    expect(html).not.toContain('</script><script>alert');
  });
});
