# LLM handling: the CMS ships AI UI and no AI

Decided 2026-08-13 (DCMS-1971 follow-up). This document records where the line between the CMS and
an LLM integration falls, and why. The how-to for writing an integration is
[`docs/core/llm.md`](../../core/llm.md); this is the reasoning behind the shape it describes.

## The problem

AI had accumulated in three places at once, and each one was in the wrong place for a different
reason:

1. **`src/ai/`: a server inside a client package.** `decapAi()` was a `fetch(Request) => Response`
   handler with `POST /chat` plus session endpoints, a Vercel AI SDK model call, Bearer auth and
   scope checks. Nothing in `src/` imported it. It existed only so consumers could mount it, but it
   dragged `ai`, `@ai-sdk/anthropic` and `@ai-sdk/openai` into a package whose job is a browser
   admin UI, and it pinned six subpath exports to hold it.
2. **The `ai-chat` widget did three unrelated jobs.** It owned the transport (`useChat` +
   `DefaultChatTransport`), executed the model's tool calls against the Redux store (reading state,
   applying a JSON Patch, dispatching a hand-rolled `changeDraftField`), and rendered the chat UI.
   It was a widget only because a widget was the sole injection point in v3, though a conversation
   about an entry was never a field of that entry.
3. **The translate action was a second, independent client.** `useAiTranslate` reached the same
   upstream by its own route, with its own prompt builder and its own JSON Patch extractor. Two
   transports, two conversations, no way for a translation to be followed up on.

Underneath all three: a chat window and a translate button should be talking to the _same_ thing,
and a CMS should not be shipping server code or an opinion about which model you pay for.

## The decision

**The CMS ships the client half of AI and nothing else.** Concretely, it owns:

- an assistant panel in the editor and a "translate from &lt;locale&gt;" action in the locale row,
- `LlmDocumentBridge`: read the open draft, patch it, list its fields,
- one shared session per open entry.

Everything on the far side is a host-supplied `LlmTransport`
(`packages/decap-cms/src/lib/util/types/cms/llm.ts`): model, endpoint, prompts, streaming,
credentials, conversation persistence. With no transport configured, none of that UI renders and no
extra DOM exists.

Five choices follow from that, each of which could have gone otherwise:

### 1. The line falls at the document, because the document is client-side

The entry being edited is Redux state in this browser. A model that edits it must have its tool
calls executed here. That is a job only the CMS can do, so it is the one thing the CMS has to own,
and `LlmDocumentBridge` is the entire surface a transport gets: no store, no dispatch, no internals.
Writes go through the published `changeDraftField` action, so an AI edit is indistinguishable from a
keystroke: same reducer, same dirty-state diffing, same `entryDraftChange` event for other
extensions. This is also why the server declares `getDocumentData` / `updateDocument` with no
`execute`: the SDK ships them to the client by design, not by accident.

A patch addressing a field the collection does not have is skipped with a warning rather than
thrown. A model can invent a field name, and that must not break editing.

### 2. Props first, registry as the escape hatch

A transport is supplied by `DecapCmsProvider`'s `llm` prop; `CMS.registerLlmTransport` sets the same
slot, and the prop wins when both are present. Same rule as `CmsSlots` and, now, editor panels.

Registration is a side effect and side effects are worse than arguments, but removing it would cost
something real: hacking behaviour into an already-compiled `decap-cms.js` from a `<script>` tag is a
capability this fork deliberately keeps (it is how the demo installs widgets and blocks). So both
exist, with the deployment winning over whatever one of its dependencies installed behind its back.

### 3. One session per entry, shared by every piece of AI UI

`src/core/lib/llmSession.tsx` owns the session above both consumers. A translation is a _turn in the
conversation_, sent with `sendPrompt(prompt, { visible: false })` so the generated instruction never
clutters the transcript. The user can then follow it up ("make that less formal") instead of hitting
a dead end. Had either component owned the session, the other would have had to reach into it.

Creation is lazy: opening an entry is not consent to start a possibly-billed session.

### 4. Authentication stays out of the interface

An AI endpoint is not the git backend and need not trust the same issuer, so there is no CMS token
that would be the right one to lend in general. `LlmTransport` therefore has no `signIn` /
`isAuthenticated`, and the CMS passes no credentials to it. Whoever builds the transport supplies
them: from their own auth, or by asking the CMS explicitly
(`currentBackend(store.getState().config).getToken()`, exported and refresh-aware) when their
endpoint does happen to trust that issuer.

An interim design had the CMS lend an `LlmHost` with `getToken()` to every transport call. It was
rejected: it bakes "the AI service trusts the git backend's issuer" into the interface, which is one
deployment's arrangement, not a general truth. Reading the token is a decision, and the interface
should not make it silently on the implementor's behalf.

`getToken()` rather than a stored token, when a transport does borrow the CMS's identity: refresh
grants ROTATE the token pair, so a second independent refresher would revoke the backend's session.

### 5. Panels are a drawer, not a third pane

The chat needs somewhere to live, and `EditorInterface` is the mount point both shells share. Its
`SplitPane` already coordinates a narrow-viewport direction flip, scroll sync and the i18n
dual-control-pane mode. Threading a third pane through all of that would risk everyday editing to
serve an optional extra, so panels overlay instead: `slots.editorPanels` (additive, unlike every
other slot) plus `CMS.registerPanel`, rendered by `EditorPanels.tsx`. Zero panels means today's
tree, byte for byte.

## Where the code lives now

```
@laikacms/server/ai              server: model call, auth, session persistence
  (laika-cms repo)               `ai` is an OPTIONAL peer there

@laikacms/decap-cms              client UI + the seam, and no AI dependency at all
  src/lib/util/types/cms/llm.ts    LlmTransport / LlmSession / LlmDocumentBridge
  src/core/lib/llm.tsx             resolution: prop, then registry
  src/core/lib/llmSession.tsx      the one session per entry
  src/core/lib/llmDocumentBridge.ts + jsonPatch.ts
  src/core/components/Editor/EditorPanels.tsx, AiChatPanel/, AiTranslateAction.tsx

@laikacms/decap-cms-llm-dulla    the wire: streaming, credentials, client-side tool execution
  (extensions/llm/dulla)         where the `ai` dependency lives
```

"Dulla" is wordplay on the Dullahan, the headless rider: the part that sits on top of a headless CMS
and does the talking. It is a name for one implementation, not for the seam. The seam is called
`LlmTransport` precisely because `core/` and `lib/` stay vendor-neutral; no Laika vocabulary appears
in them.

## Alternatives rejected

| Alternative                                            | Why not                                                                                                                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep AI as a widget                                    | A conversation about an entry is not a field of that entry. The widget registry was a workaround for having no other injection point, and it forced chat into the form.     |
| Keep `decapAi()` in the CMS package                    | Server code in a browser package, three AI dependencies nothing in `src/` imported, six subpath exports held hostage to it.                                                 |
| Execute document tools server-side                     | The document is in the browser. A server-side `updateDocument` would need the CMS to upload the draft, and the write would bypass the reducer, dirty-state and event paths. |
| Ship a default transport                               | It would encode a model, an endpoint and a billing relationship that no CMS should assume.                                                                                  |
| `LlmHost.getToken()` lent by the CMS                   | Assumes the AI endpoint trusts the git backend's issuer. True for Laika's own deployment, not in general. See choice 4.                                                     |
| `fast-json-patch` for `applyPatch`                     | Entry data holds `RichtextValue` class instances that a JSON round-trip flattens. The hand-rolled applier does copy-on-write along the patched path only, preserving them.  |
| A third `SplitPane` pane for the panel                 | See choice 5.                                                                                                                                                               |
| One callback per UI region (`registerLocaleAction`, …) | Convoluted at the seam level: an AI integration should implement one interface, not one callback per place the CMS wants to render something.                               |

## Consequences

- **`@laikacms/decap-cms` has no AI dependency.** `ai`, `@ai-sdk/*` and (with `src/ai` gone)
  `decap-cms-lib-pat` are off the dependency list; the export map went from 34 subpaths to 28. That
  count is pinned in `src/__tests__/exports-count.test.ts` and `restructure.md`.
- **A deployment with no transport is unchanged.** No panel toggle, no drawer, no translate action,
  no DOM. Pinned by tests in `EditorPanels.spec.tsx` and `AiTranslateAction.spec.tsx`.
- **Every piece of AI UI is testable without a model.** The panel, the action and the bridge are all
  driven in tests by a fake `LlmTransport`: no network, no SDK. That is the point of the seam, not a
  side effect of it.
- **Two transports for one entry is now impossible by construction.** Anything that wants to talk to
  the model goes through the shared session.
- **Version matching.** `@laikacms/decap-cms-llm-dulla` takes the CMS as a `^4.0.0` peer, like every
  other package under `extensions/`, and its tests require the CMS to be built first.
- **Session keys changed.** Dulla stores conversations under `collection/slug`; the deprecated
  widget used the bare slug, so old conversations are not listed. Accepted: the widget is on its way
  out.
- **Transitional overlap.** `@laikacms/decap-cms-widget-aichat` and
  `@laikacms/decap-cms-ai-translate` still exist and still register themselves. A consumer who
  installs `ai-translate` _and_ configures a transport gets two translate buttons in the locale row.
  Both packages are deprecated in favour of the built-in panel and action.

## Terminology

| Term                | Meaning                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `LlmTransport`      | The seam. Host-supplied connection to a model. Names no vendor.                                            |
| `LlmSession`        | One conversation about one entry. A subscribe/snapshot store, not a React hook.                            |
| `LlmDocumentBridge` | The whole of a transport's access to CMS state: `read()`, `applyPatch()`, `fields()`.                      |
| hidden prompt       | `sendPrompt(text, { visible: false })`. The model sees it, the transcript does not.                        |
| Dulla               | Laika's `LlmTransport` implementation, in `extensions/llm/dulla`. One implementation, not the seam itself. |
| Puca                | Codename for the Laika MCP server. Unrelated to this seam; it mutates the repo, and the CMS notices        |
|                     | through the existing freshness / `getChanges` path.                                                        |

## What this means for code in this repo

- New AI _UI_ (a "summarise" button, an alt-text suggester) belongs in `core/`, driving the shared
  session through `useLlmSession()`. It must render nothing when no transport is configured.
- New model/endpoint/provider work belongs in a transport package under `extensions/llm/*`, or in
  the consumer's own code. Not in `core/`.
- Anything a transport needs from CMS state and cannot reach is a gap in `LlmDocumentBridge` or the
  published exports, and the fix belongs there rather than in a transport reaching around the seam.
- `core/` and `lib/` keep no vendor vocabulary: no `Dulla`, no `Laika`, no provider names.
