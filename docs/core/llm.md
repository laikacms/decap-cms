# `LlmTransport` — the AI seam

The CMS ships AI **UI** and no AI: an assistant panel, a "translate from &lt;locale&gt;" action in
the editor's locale row, and the document access those need. Everything on the far side — model,
endpoint, prompts, streaming, credentials, conversation storage — belongs to a host-supplied
`LlmTransport` (`packages/decap-cms/src/lib/util/types/cms/llm.ts`). With none configured, none of
that UI renders.

For _why_ the line falls there, see
[decisions/architecture.md](../contributing/decisions/architecture.md). This document is how to
write a transport.

## Supplying one

Props first, registry as the escape hatch — the same rule as [slots](./slots.md):

```tsx
import { createDullaTransport } from '@laikacms/decap-cms-llm-dulla';

<DecapCmsProvider llm={createDullaTransport({ apiBasePath: '/api/ai' })}>…</DecapCmsProvider>;
```

```ts
// For injecting into an already-compiled bundle. The prop wins if both are set.
CMS.registerLlmTransport(myTransport);
```

## The interface

```ts
interface LlmTransport {
  openSession(document: LlmDocumentBridge): LlmSession;
  listSessions?(context: LlmDocumentContext): Promise<LlmSessionSummary[]>;
  resumeSession?(id: string, document: LlmDocumentBridge): Promise<LlmSession>;
}
```

`openSession` is called once per editor mount, lazily: opening an entry starts nothing, because a
session may be billable. The returned session is shared by every piece of AI UI on that screen, so a
translation lands in the same conversation the panel renders and can be followed up on.

`listSessions` / `resumeSession` are optional. A transport that omits them gets no history dropdown,
and everything else still works.

### `LlmSession`

A subscribe/snapshot store, not a React hook, so the CMS can render it through
`useSyncExternalStore` and stay free of any streaming library:

```ts
interface LlmSession {
  id?: string;
  messages: LlmMessage[];
  status: 'idle' | 'streaming' | 'error';
  error?: Error;
  sendPrompt(text: string, options?: { visible?: boolean, signal?: AbortSignal }): Promise<void>;
  stop?(): void;
  subscribe(listener: () => void): () => void;
  dispose?(): void;
}
```

`messages` may be mutated in place while streaming as long as `subscribe` fires; the panel repaints
on notify rather than on a new array identity.

`sendPrompt(text, { visible: false })` drives the session without the prompt joining the transcript.
That is how the translate action reuses the chat's session without filling it with generated
instructions — the model sees it, the user does not. `sendPrompt` should reject on failure; the UI
surfaces the message.

### `LlmDocumentBridge`

The entire surface a transport gets onto CMS state:

```ts
interface LlmDocumentBridge {
  context: { collection: string, slug: string, locale?: string };
  read(): Record<string, unknown>;
  applyPatch(operations: LlmPatchOperation[]): { changed: string[] };
  fields(): CmsEntryField[];
}
```

No store, no dispatch, no internals. `applyPatch` takes RFC 6902 operations and writes through the
published `changeDraftField` action, so an AI edit is indistinguishable from a keystroke: same
reducer, same dirty-state diffing, same `entryDraftChange` event for other extensions. Operations
addressing fields that do not exist are skipped rather than thrown on — a model can invent a field
name, and that should not break the editor.

**Tool calls are executed by the transport, not the server.** The entry being edited is client-side
state, so a `updateDocument`-style tool has to run here, against this bridge.

## Credentials

Deliberately not in the interface. An AI endpoint is not the git backend and need not trust the same
issuer, so there is no CMS token that is right to lend in general. A transport carries whatever
credentials it likes; when its endpoint _does_ trust the CMS's backend, it asks explicitly:

```ts
import { currentBackend, store } from '@laikacms/decap-cms/core';

const token = await currentBackend(store.getState().config).getToken();
```

Use `getToken()` rather than reading a stored token: it is refresh-aware, and refresh grants rotate
the token pair, so a second independent refresher would revoke the backend's session.

## Where the UI lives

| Piece                 | File                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| Interface             | `src/lib/util/types/cms/llm.ts`                                      |
| Transport resolution  | `src/core/lib/llm.tsx` (prop, then registry)                         |
| Shared session        | `src/core/lib/llmSession.tsx`                                        |
| Document bridge       | `src/core/lib/llmDocumentBridge.ts`, `src/core/lib/jsonPatch.ts`     |
| Panel region (drawer) | `src/core/components/Editor/EditorPanels.tsx`                        |
| Chat panel            | `src/core/components/Editor/AiChatPanel/AiChatPanel.tsx`             |
| Translate action      | `src/core/components/Editor/EditorControlPane/AiTranslateAction.tsx` |

## Reference implementation

`extensions/llm/dulla` (`@laikacms/decap-cms-llm-dulla`) implements all of the above against
`@laikacms/server/ai`, using the Vercel AI SDK for the wire. Like every package under `extensions/`,
it is written against the published subpath exports only, so it doubles as proof that this seam is
sufficient from outside.
