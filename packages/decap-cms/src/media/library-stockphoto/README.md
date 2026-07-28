# Stock photo media library

An external `registerMediaLibrary` integration that lets editors search a stock photo provider
(currently [Unsplash](https://unsplash.com/developers)) from inside Decap CMS and insert a result as
a normal media asset — the selected photo is downloaded and persisted through the core
`persistMedia` flow (same path a manually uploaded file takes), not just hot-linked from the
provider's CDN.

DCMS-1396 asked for Pexels, Pixabay, and Unsplash. This slice ships the plumbing (a
`StockPhotoProvider` interface, a provider registry, search UI, download-and-persist, attribution)
plus one working provider. Pexels and Pixabay are **deferred** — add them under
`src/media/library-stockphoto/providers/` implementing `StockPhotoProvider` and register them in
`providers/index.ts`.

## Usage

```ts
import { registerMediaLibrary } from '@laikacms/decap-cms/core';
import stockPhotoMediaLibrary from '@laikacms/decap-cms/media/library-stockphoto';

registerMediaLibrary(stockPhotoMediaLibrary);
```

```yaml
# config.yml
media_library:
  name: stockphoto
  config:
    provider: unsplash # optional, defaults to 'unsplash'
    apiKey: 'your-unsplash-access-key' # required — never commit a real key
    perPage: 20 # optional, defaults to 20
```

Like the Cloudinary and Uploadcare integrations, registering this media library replaces the
built-in asset browser entirely (Decap CMS supports one active `media_library` at a time) — there is
no combined "built-in browser + stock photo tab" mode yet. Reintroducing that would require changes
to the core `MediaLibrary` component and is out of scope here (noted as follow-up).

## `media_library.config`

- `provider` (optional, default `'unsplash'`) — which registered `StockPhotoProvider` to use.
- `apiKey` (required) — the API key/access token for the chosen provider. Read from CMS config at
  runtime; this repo does not ship, fetch, or hardcode a real key. If omitted, the search UI shows an
  inline message instead of calling the provider.
- `perPage` (optional, default `20`) — results requested per search.

## Behavior

- `show()` opens a modal with a search box and a results grid; `hide()` closes it.
- Selecting a result downloads the provider's full-resolution image (`fetch` + `blob()`), wraps it in
  a `File`, and dispatches the core `persistMedia` thunk (`@/core/actions/mediaLibrary`) so it's
  written into the configured media folder like any other upload. The resulting asset path is then
  passed to `handleInsert`, same as the built-in browser's insert action.
- Each result card shows `Photo by <photographer> on <provider>` attribution beneath the thumbnail.
- `enableStandalone()` returns `true` — this integration can be opened both as the general "Media"
  button and per-field, matching the Cloudinary integration.

## Adding a provider

Implement `StockPhotoProvider` (`providers/types.ts`):

```ts
export interface StockPhotoProvider {
  name: string;
  search(query: string, options: { apiKey: string, page?: number, perPage?: number }): Promise<{
    results: StockPhotoResult[],
    totalPages?: number,
  }>;
}
```

Register it in `providers/index.ts`'s `stockPhotoProviders` map under the key editors will set as
`media_library.config.provider`.
