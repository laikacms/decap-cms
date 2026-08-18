# @laikacms/decap-cms-llm-dulla

Dulla, the Laika LLM transport for Decap CMS. Named for the Dullahan, the headless rider: the part
that sits on top of a headless CMS and does the talking.

The CMS ships AI **UI** — a chat panel and a translate action — and no transport, no model and no
`ai` dependency. Dulla is one implementation of the `LlmTransport` seam those speak to. It talks to
[`@laikacms/server/ai`](https://www.npmjs.com/package/@laikacms/server).

| Piece        | Owns                                                         |
| ------------ | ------------------------------------------------------------ |
| Decap CMS    | the panel, the translate action, the document bridge         |
| Dulla (here) | the wire: streaming, credentials, client-side tool execution |
| `server/ai`  | the model, the system prompt, session persistence            |

```bash
pnpm add @laikacms/decap-cms-llm-dulla
```

## Usage

Pass the transport in, which is the preferred route when you own the app:

```tsx
import { createDullaTransport } from '@laikacms/decap-cms-llm-dulla';

const llm = createDullaTransport({
  apiBasePath: '/api/ai',
  getToken: () => myAuth.getAccessToken(),
});

<DecapCmsProvider llm={llm}>…</DecapCmsProvider>;
```

Or, when props can't reach the call site (e.g. the CMS is configured before your app code runs),
register it instead:

```ts
import { registerDulla } from '@laikacms/decap-cms-llm-dulla';

registerDulla({ apiBasePath: '/api/ai' });
```

This package ships plain ES modules (`"type": "module"`, `tsc`-built, no bundler) — there is no
`<script>`-tag / global-variable route. Both `createDullaTransport` and `registerDulla` are only
reachable via the ESM import above.

With a transport configured, an **Assistant** panel appears in the editor, and the locale row gains
a translate action for i18n collections. With none, neither renders.

## Options

| Option        | Type                                              | Default   | Purpose                                              |
| ------------- | ------------------------------------------------- | --------- | ---------------------------------------------------- |
| `apiBasePath` | `string`                                          | `/api/ai` | Where `decapAi()` is mounted                         |
| `getToken`    | `() => string \| null \| undefined \| Promise<…>` | none      | Bearer token, resolved per request                   |
| `fetch`       | `typeof fetch`                                    | global    | Custom base URL, credentials mode, or tests          |
| `body`        | `Record<string, unknown>`                         | none      | Extra fields merged into every `/chat` body          |
| `onError`     | `(error: Error) => void`                          | none      | Transport-level failures, in addition to the session |

### Credentials are yours to supply

Dulla never goes looking for a token. An AI endpoint is not the git backend and need not trust the
same issuer, so guessing would be wrong as often as it was right. Supply `getToken` and the answer
is explicit:

```ts
// Your own auth:
createDullaTransport({ getToken: () => myAuth.getAccessToken() });

// Or the CMS's backend token, when your endpoint does trust that issuer.
// `getToken()` is refresh-aware, which is why this borrows it rather than
// reading a stored token: refresh grants rotate the pair.
import { currentBackend, store } from '@laikacms/decap-cms/core';

createDullaTransport({
  getToken: () => currentBackend(store.getState().config).getToken(),
});
```

Omit it for cookie-based auth or a same-origin endpoint that needs none: no `Authorization` header
is sent.

## What runs where

`getDocumentData` and `updateDocument` arrive from the server without an `execute`, so they run
here, against the `LlmDocumentBridge` the CMS hands over:

- `getDocumentData` answers with the open draft.
- `updateDocument` applies its RFC 6902 patch to the draft and reports back the field names that
  changed, which is what the transcript shows as "updated title, body".

A patch the CMS rejects (a field the model invented, say) comes back as tool output rather than an
error, so the next turn can correct itself instead of the conversation dying.

## Sessions

Conversations are stored server-side per document, keyed by `collection/slug`. The panel's history
dropdown is `listSessions` + `resumeSession`; a server without persistence simply reports none and
the dropdown never appears.

> Sessions written by the deprecated `@laikacms/decap-cms-widget-aichat` were keyed by bare slug and
> are not listed here.

## Hidden prompts

`sendPrompt(text, { visible: false })` drives the session without the prompt joining the transcript
— how the translate action reuses the chat's session without filling it with generated instructions.
Dulla marks those messages with `HIDDEN_METADATA_KEY` and filters them out of what the CMS sees. The
model still gets them.
