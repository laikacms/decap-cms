import React, { createContext, useContext } from 'react';

import { getLlmTransport } from './registry';

import type { LlmTransport } from '@/lib/util/index';

/**
 * Resolution of the host-supplied `LlmTransport` (see
 * `src/lib/util/types/cms/llm.ts` for what a transport is and why the CMS
 * ships none of its own).
 *
 * Two sources, exactly like `CmsSlots`:
 *
 *  1. A transport passed to `DecapCmsProvider` as the `llm` prop. This is the
 *     path to prefer: it is explicit, has no import-time side effects, and a
 *     composing app can see at a glance what its CMS is wired to.
 *  2. A transport installed with `CMS.registerLlmTransport`, for the case
 *     props cannot reach — hacking behaviour into an already-compiled bundle
 *     from a `<script>` tag, the way `dev-test/index.html` injects widgets and
 *     blocks today.
 *
 * The prop wins, so a deployment can always override what one of its
 * dependencies installed.
 */

const LlmTransportContext = createContext<LlmTransport | undefined>(undefined);

export interface LlmTransportProviderProps {
  llm?: LlmTransport | undefined;
  children?: React.ReactNode;
}

export function LlmTransportProvider({ llm, children }: LlmTransportProviderProps) {
  return <LlmTransportContext.Provider value={llm}>{children}</LlmTransportContext.Provider>;
}

/**
 * The transport in effect, or `undefined` when the CMS has none — which is the
 * default. Every piece of AI UI in the CMS renders nothing in that case, so a
 * deployment that never supplies a transport sees no AI at all.
 */
export function useLlmTransport(): LlmTransport | undefined {
  const fromProps = useContext(LlmTransportContext);
  return fromProps ?? getLlmTransport();
}
