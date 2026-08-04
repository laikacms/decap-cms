/**
 * Renders the popup page that completes the `window.postMessage` handshake
 * expected by `decap-cms-lib-auth`'s `NetlifyAuthenticator`
 * (packages/decap-cms-lib-auth/src/netlify-auth.js):
 *
 *   1. This page announces itself: `authorizing:<provider>` to `window.opener`.
 *   2. The opener (already listening, see `Authenticator#authenticate`) echoes
 *      the same message back so this page learns the opener's real origin.
 *   3. This page posts the final payload:
 *      `authorization:<provider>:success:<json>` or `...:error:<json>`.
 *
 * All dynamic values are passed through `JSON.stringify` before being
 * embedded in the script, so untrusted input (the validated request origin,
 * error text from GitHub, etc.) cannot break out of the string literals.
 */
function escapeClosingScriptTag(json: string): string {
  return json.replace(/<\/script/gi, '<\\/script');
}

export function renderHandshakeHtml(
  provider: string,
  origin: string,
  kind: 'success' | 'error',
  payload: unknown,
): string {
  const providerJson = escapeClosingScriptTag(JSON.stringify(provider));
  const originJson = escapeClosingScriptTag(JSON.stringify(origin));
  const payloadJson = escapeClosingScriptTag(JSON.stringify(payload));
  const kindJson = escapeClosingScriptTag(JSON.stringify(kind));

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Authorizing...</title></head>
<body>
<script>
(function() {
  var provider = ${providerJson};
  var expectedOrigin = ${originJson};
  var kind = ${kindJson};
  var payload = ${payloadJson};

  function send(targetOrigin) {
    window.opener.postMessage(
      'authorization:' + provider + ':' + kind + ':' + JSON.stringify(payload),
      targetOrigin
    );
  }

  function receiveMessage(e) {
    if (e.origin !== expectedOrigin) return;
    window.removeEventListener('message', receiveMessage, false);
    send(e.origin);
  }

  if (window.opener) {
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:' + provider, expectedOrigin);
  }
})();
</script>
</body>
</html>
`;
}
