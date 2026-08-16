## Why a single package repo with seperate xport paths instead of a monorepo with seperate packages.

For the same exact reason AWS decided to put all their packages in one big package: Transitive
dependency drift. Transitive dependencies will cause problems in consumer packages. We had this
exact problem and decided that it would be far cleaner to use export paths.

## Why not replace @emotion/styled with X:

Because Decap's original emotion setup is actually pretty good. Even though its not used as much
nowadays, it doesnt force you to bundle it a certain way. Because emotion smartly interacts with
typescript's jsxImportSource propery, no additional bundling is needed. I found vanilla-extract has
a nice "zero-runtime" feature but is not ideal for libraries since it forces opiniated bundling. We
don't want to force users of Laika CMS to use a specific technology. Tailwind CSS: While I use it
for almost all of my apps, for a library, it's not the right tool for obvious reasons. CSS Modules:
The best candidate next to @emotion. It needs custom bundling but support is very good. It doesnt
provide the advantages that @emotion provides and a rewrite would take a considerable amount of
time.

## Why not use effect in decap-cms?:

There are very good reasonos to use effect but also a lot of reasonos to not use it for this
project:

- Learning curve: Unlike Laika Code, any dev should be able to easily look at, and change the
  decap-cms source code, and FP is not something all or even most dev's are acustomed with.
- Types: Effect relies on the Typescript compiler a lot. Decap-CMS's interfaces would leak these
  types (there are ways to not do this but it would kind of defeat the purpose of having Effect
  since) and small changes per version means that type errors when things feel like they should just
  work, happen. There are libraries that started of with effect but have had to completely remove it
  from their code because of these issues.
- Fit: We are dealing mostly with UI and state. The place where Effect-ts would shine the most is
  for CRUD. Which is mostly done by [laikacms](https://github.com/laikacms/laikacms) code, which
  already uses Effect-TS.

## Why `yaml` over `js-yaml` or `yamljs`

Because YAML is already used in `decap-cms` to parse YAML comments, something js-yaml or yamljs
don't do.

We might as well reuse a dependency that's already used.

## Why the CMS ships AI UI but no AI

The CMS contains a chat panel and a "translate from <locale>" action, and no model, endpoint,
prompt-transport or streaming library. Everything on the far side of `LlmTransport`
(`src/lib/util/types/cms/llm.ts`) is supplied by the host, through `DecapCmsProvider`'s `llm` prop
or `CMS.registerLlmTransport`. With no transport configured, none of that UI renders at all.

The line falls there because of where the _document_ lives. The entry being edited is client-side
Redux state, so a model that edits it must have its tool calls executed in the browser. That is a
job only the CMS can do, and it is the one thing the CMS therefore has to own: `LlmDocumentBridge`
(`src/core/lib/llmDocumentBridge.ts`) is the entire surface a transport gets — read the draft, patch
the draft, list the fields. Writes go through the published `changeDraftField` action, so an AI edit
is indistinguishable from a keystroke: same reducer, same dirty-state diffing, same
`entryDraftChange` event to any other extension listening.

Everything on the other side of that line is somebody else's opinion:

- **Which model, and who pays.** Not a CMS concern in any deployment we can foresee.
- **Authentication.** An AI endpoint is not the git backend and need not trust the same issuer, so
  there is no CMS token that would be the right one to lend. The transport is a closure the host
  constructs, so it carries whatever credentials it likes; one whose endpoint does happen to trust
  the backend's token asks for it explicitly (`currentBackend(store.getState().config).getToken()` —
  exported, and refresh-aware, which is why it is borrowed rather than re-read from storage).
  `LlmTransport` therefore has no `isAuthenticated`/`signIn`, and will not grow them until a
  separate identity has to surface in the CMS's own UI.
- **Conversation persistence.** Optional (`listSessions`/`resumeSession`); a transport that omits
  them simply gets no history UI.

The session is shared rather than per-component (`src/core/lib/llmSession.tsx`): the translate
action sends a hidden prompt into the same conversation the chat panel renders, so a translation is
a turn the user can follow up on ("make that less formal") instead of a dead end. It is created
lazily — opening an entry is not consent to start a possibly-billed session.

This replaces an earlier arrangement where the CMS shipped `decapAi()`, a server-side chat adapter,
and the chat lived in an `ai-chat` _widget_ — which only existed because a widget was the sole
injection point in v3, though a conversation about an entry was never a field of that entry. The
server moved out to laika as `@laikacms/server/ai`, and the widget became a panel
(`slots.editorPanels`).

The client half of that server ships as `extensions/llm/dulla` — `createDullaTransport()`, which
implements `LlmTransport` over those endpoints, executes the two document tools against the bridge,
and is where the `ai` dependency now lives. It is an extension like any other: written against the
published exports only, and entirely optional.
