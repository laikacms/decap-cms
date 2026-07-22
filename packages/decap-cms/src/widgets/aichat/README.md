# AI Chat widget

The AI Chat widget (`ai-chat`) renders a document-scoped chat panel backed by the
[Vercel AI SDK](https://sdk.vercel.ai/) (`useChat` from `@ai-sdk/react`, re-exported from this
package). It talks to a server adapter under a configurable base path, streams assistant replies,
and can apply JSON Patch operations proposed by tools back onto the current entry's draft fields.

Widget-level options are not passed via the collection's field config (`{ widget: 'ai-chat' }`);
they're passed when registering the widget, as the `AiChatWidgetOptions` argument to
`DecapCmsWidgetAiChat.Widget(opts)` (`index.ts`), and are exposed to `AiChatControl` as the
`widget` prop.

## Config

```ts
import { DecapCmsWidgetAiChat } from '@laikacms/decap-cms/widgets/aichat';

CMS.registerWidget(
  DecapCmsWidgetAiChat.Widget({
    aiSdk: {
      api: '/api/ai',
      body: { projectId: 'my-project' },
      onError: error => console.error('AI chat error', error),
    },
  }),
);
```

- `aiSdk.api` (optional, default `'/api/ai'`) — the API base path for the chat/session endpoints;
  must match the `basePath` option on the server adapter. Declared on `AiSdkOptions` in `types.ts`
  and read in `AiChatControl.tsx` as `widget.aiSdk?.api || '/api/ai'`, from which the chat endpoint
  (`${apiBasePath}/chat`) and the sessions endpoint (`apiBasePath`) are both derived.
- `aiSdk.fetch` (optional, default the global `fetch`) — a custom `fetch` implementation, useful for
  attaching auth headers or routing through a proxy. Read as `widget.aiSdk?.fetch || fetch` in
  `AiChatControl.tsx` and used both for the `DefaultChatTransport` (streaming chat) and for the
  session-list/session-detail requests.
- `aiSdk.body` (optional) — extra fields merged into every chat request body, alongside the
  session id and document context the widget adds automatically. Read as `widget.aiSdk?.body` and
  spread into the `DefaultChatTransport`'s per-request `body()` callback in `AiChatControl.tsx`.
- `aiSdk.onError` (optional) — called with the `Error` whenever `useChat`'s `onError` fires (e.g. a
  failed request or stream error). Invoked as `widget.aiSdk?.onError?.(err)` in the `useChat`
  `onError` handler in `AiChatControl.tsx`, after the widget sets its own local error state.
- `aiSdk.onFinish` (optional) — called with the finish event whenever `useChat`'s `onFinish` fires
  (i.e. the chat stream has finished). Invoked as `widget.aiSdk?.onFinish?.(event)` in the `useChat`
  `onFinish` handler in `AiChatControl.tsx`.
- `messages` (optional) — a `Translation` object (see `i18n/types.ts`, shape defined by `en.ts`) that
  overrides the widget's UI strings (button labels, placeholders, error text, etc.) for
  localization. Read in `AiChatControl.tsx` as `const t = widget.messages ?? en`, falling back to
  the English defaults (`i18n/en.ts`) for any translation not supplied. A Dutch translation ships at
  `i18n/nl.ts` as a reference implementation.

Two of the widget's user-facing strings — the placeholder and welcome message — are actually
per-field overrides rather than widget-level options: `field.placeholder` and
`field.welcomeMessage` on the collection's field config take precedence over `t.defaultPlaceholder`
and `t.defaultWelcomeMessage` from `messages`/`en`.
