import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'react-redux';

import { useAppDispatch } from '@/core/hooks/useRedux';
import { useLlmTransport } from '@/core/lib/llm';
import { createLlmDocumentBridge } from '@/core/lib/llmDocumentBridge';

import type { RootState } from '@/core/redux';
import type { CmsCollectionState, CmsEntry, LlmSession, LlmTransport } from '@/lib/util/index';

/**
 * The one conversation about the open entry.
 *
 * It lives here, above every piece of AI UI, because the chat panel and the
 * translate action are two views of the *same* session: a translation is a
 * prompt in the conversation, so it can be followed up on ("make that less
 * formal") instead of being a dead end. Owning it in either component would
 * make the other reach into it.
 *
 * Creation is lazy. A transport may well open a server-side session, and
 * merely opening an entry is not consent to that — nothing happens until some
 * UI actually asks for a session.
 */

interface LlmSessionContextValue {
  /** The live session, or `undefined` until something calls `ensureSession`. */
  session: LlmSession | undefined;
  /** Opens the session if needed. `undefined` when no transport is configured. */
  ensureSession: () => LlmSession | undefined;
  /** Abandons the current session; the next `ensureSession` starts a fresh one. */
  resetSession: () => void;
  /** Replaces the current session with a persisted one, when the transport supports it. */
  resumeSession: (id: string) => Promise<void>;
}

const LlmSessionContext = createContext<LlmSessionContextValue | undefined>(undefined);

export interface LlmSessionProviderProps {
  collection: CmsCollectionState;
  entry: CmsEntry;
  locale?: string | undefined;
  children?: React.ReactNode;
}

/**
 * Mounts the session machinery only when a transport is configured. Everything
 * below reads the Redux store, and the editor must stay renderable without a
 * store `Provider` (as its own tests do) for a deployment that has no AI.
 */
export function LlmSessionProvider({ children, ...props }: LlmSessionProviderProps) {
  const transport = useLlmTransport();

  if (!transport) {
    return <>{children}</>;
  }

  return (
    <ActiveLlmSessionProvider {...props} transport={transport}>
      {children}
    </ActiveLlmSessionProvider>
  );
}

function ActiveLlmSessionProvider({
  collection,
  entry,
  locale,
  transport,
  children,
}: LlmSessionProviderProps & { transport: LlmTransport }) {
  const dispatch = useAppDispatch();
  // Read the store through context rather than importing the singleton: the
  // editor should not pull the whole store module into its import graph.
  const reduxStore = useStore<RootState>();
  const [session, setSession] = useState<LlmSession | undefined>(undefined);

  // The bridge reads the entry through this ref rather than closing over it:
  // a session outlives many renders, and a transport holding a stale entry
  // would patch data the user has already changed.
  const entryRef = useRef(entry);
  entryRef.current = entry;

  const bridge = useMemo(
    () =>
      createLlmDocumentBridge({
        collection,
        getEntry: () => entryRef.current,
        ...(locale ? { locale } : {}),
        dispatch,
        getState: reduxStore.getState,
      }),
    [collection, locale, dispatch, reduxStore],
  );

  // A session belongs to one entry. Switching entries (or locales) drops it,
  // and the transport gets the chance to release whatever it was holding.
  const slug = entry?.slug;
  useEffect(() => {
    return () => {
      setSession(current => {
        current?.dispose?.();
        return undefined;
      });
    };
  }, [collection.name, slug, locale, transport]);

  const ensureSession = useCallback(() => {
    if (session) return session;

    const opened = transport.openSession(bridge);
    setSession(opened);
    return opened;
  }, [transport, session, bridge]);

  const resetSession = useCallback(() => {
    setSession(current => {
      current?.dispose?.();
      return undefined;
    });
  }, []);

  const resumeSession = useCallback(async (id: string) => {
    if (!transport?.resumeSession) return;

    const resumed = await transport.resumeSession(id, bridge);
    setSession(current => {
      if (current !== resumed) current?.dispose?.();
      return resumed;
    });
  }, [transport, bridge]);

  const value = useMemo(
    () => ({ session, ensureSession, resetSession, resumeSession }),
    [session, ensureSession, resetSession, resumeSession],
  );

  return <LlmSessionContext.Provider value={value}>{children}</LlmSessionContext.Provider>;
}

/**
 * Reads the entry's LLM session. Returns `undefined` outside an editor (or
 * when no provider is mounted), so callers render nothing rather than throw —
 * AI UI is always optional.
 */
export function useLlmSession(): LlmSessionContextValue | undefined {
  return useContext(LlmSessionContext);
}

/**
 * Re-renders the caller whenever `session` reports a change. Sessions are
 * subscribe/snapshot stores rather than React state, so a transport is free to
 * mutate `messages` in place while streaming; this subscribes and forces a
 * render instead of assuming a new array identity.
 */
export function useLlmSessionUpdates(session: LlmSession | undefined) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!session) return;
    return session.subscribe(() => forceRender(tick => tick + 1));
  }, [session]);
}
