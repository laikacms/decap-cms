# AI translate

> **Deprecated.** This standalone package is deprecated in favor of the built-in
> `AiTranslateAction` locale-row action shipped with the CMS core
> (`src/core/components/Editor/EditorControlPane/AiTranslateAction.tsx`). Registering
> `registerAiTranslate()` still works and logs a runtime deprecation warning, but new consumers
> should use the in-core action instead of installing this package.

One-click AI translation of an entry's fields from the collection's default locale into the locale
being edited. Adds a "Translate from &lt;locale&gt;" button to the editor's locale row, next to the
built-in locale dropdowns.

It drives the CMS's own AI adapter (`decapAi()`, `POST {apiBasePath}/chat`) through the same
`updateDocument` tool round-trip the chat widget uses, so it inherits whatever provider (Anthropic,
OpenAI, ...) you configured. It introduces no provider mechanism of its own and holds no API keys:
the browser only talks to your `decapAi()` endpoint.

This package was extracted from the CMS core (DCMS-1395). Nothing renders unless you register it, so
an install that never calls `registerAiTranslate()` ships no AI client code and shows no button.

## Install and register

```sh
npm install @laikacms/decap-cms-ai-translate
```

```ts
import CMS from '@laikacms/decap-cms';
import { registerAiTranslate } from '@laikacms/decap-cms-ai-translate';

registerAiTranslate();
```

Importing the module registers nothing; the call does. It is idempotent, so several entry points may
call it.

### Options

```ts
registerAiTranslate({
  // Where decapAi() is mounted. Default '/api/ai'.
  apiBasePath: '/api/ai',
  // Injectable fetch, mainly for tests.
  fetch: myFetch,
  // Set false to supply the button's strings yourself via CMS.registerLocale.
  registerPhrases: true,
});
```

## Server side

The button is a client for `decapAi()`, which you mount yourself in your app's API routes. It ships
as `@laikacms/server/ai` (it lived at `@laikacms/decap-cms/ai` until August 2026). Without it
mounted, the request 404s and the button shows the failure message.

## Behaviour

- Renders only when the entry has i18n configured and the selected locale is not the default one.
- Collects fields that are translatable between the two locales (`i18n: 'translate'`), reading
  values from the default locale, and skips fields whose source value is empty.
- Confirms before running, because it overwrites existing content in the target locale.
- Applies each translated field through the editor's normal draft-change path, so the result is an
  unsaved draft you can review, edit or discard.

## Requirements

The CMS resolves the i18n context and hands it to the action through `CMS.registerLocaleAction`
(`CmsLocaleAction` / `CmsLocaleActionRenderProps` in `@laikacms/decap-cms/lib/util`). That seam is
generic: it is also how you would add a glossary lookup or a translation-memory prefill without
patching the CMS.

## Translations

Bundles the button's own strings for all 36 locales the CMS ships, registered additively so they
merge with the CMS's phrases. Known gap inherited from core: the failure message (`translateFailed`)
exists only in English, so other locales show it untranslated.
