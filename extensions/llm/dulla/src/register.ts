import { Registry } from '@laikacms/decap-cms/core';

import { createDullaTransport } from './dullaTransport';

import type { DullaTransportOptions } from './dullaTransport';

/**
 * Registration, kept in its own module: it is the only thing here that pulls
 * the CMS runtime in. `createDullaTransport` itself imports nothing but the
 * AI SDK and types, so an app that passes the transport as a prop pays for
 * neither the registry nor a second copy of the CMS.
 */

let registered = false;

/**
 * Register Dulla as the CMS's LLM transport. Idempotent, following the
 * `registerAiTranslate` / `registerGitHubGraphQL` precedent for opt-in
 * registration.
 *
 * Prefer passing the transport as a prop when you control the app
 * (`<DecapCmsProvider llm={createDullaTransport()}>`); this exists for the case
 * props cannot reach — a `<script>` tag against an already-built
 * `decap-cms.js`.
 */
export function registerDulla(options: DullaTransportOptions = {}) {
  if (registered) return;
  registered = true;

  Registry.registerLlmTransport(createDullaTransport(options));
}
