import { persistMedia } from '@/core/actions/mediaLibrary';
import { store } from '@/core/redux';
import { getStockPhotoProvider } from '@/media/library-stockphoto/providers';

import type { AppDispatch } from '@/core/hooks/useRedux';
import type { StockPhotoProvider, StockPhotoResult } from '@/media/library-stockphoto/providers';

export type StockPhotoLibraryConfig = {
  /** Registered provider name, e.g. `'unsplash'`. Defaults to `'unsplash'`. */
  provider?: string,
  /** Client-supplied API key for the chosen provider. Never ship a real key here. */
  apiKey?: string,
  /** Results per search page. Defaults to 20. */
  perPage?: number,
};

type ShowArgs = {
  id?: string,
  value?: string,
  config?: Record<string, unknown>,
  allowMultiple?: boolean,
  imagesOnly?: boolean,
};

type InitArgs = {
  options?: { config?: StockPhotoLibraryConfig },
  handleInsert?: (value: string | string[]) => void,
};

const CONTAINER_ID = 'decap-cms-stockphoto-library';

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * Downloads a remote image and hands it to the core `persistMedia` thunk so
 * it lands in the configured media folder like any other uploaded asset,
 * rather than only inserting a hot-linked provider URL.
 */
async function downloadAndPersist(result: StockPhotoResult): Promise<string | undefined> {
  const response = await fetch(result.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download stock photo (status ${response.status})`);
  }
  const blob = await response.blob();
  const extension = blob.type?.split('/')[1] || 'jpg';
  const filename = `${result.providerName.toLowerCase()}-${result.id}.${extension}`;
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

  const action = await (store.dispatch as AppDispatch)(persistMedia(file, {}));
  const persistedFile = (action as { payload?: { file?: { path?: string } } } | undefined)?.payload?.file;
  return persistedFile?.path;
}

class StockPhotoModal {
  private container: HTMLDivElement;
  private searchInput: HTMLInputElement;
  private resultsEl: HTMLDivElement;
  private statusEl: HTMLDivElement;
  private provider: StockPhotoProvider;
  private apiKey: string | undefined;
  private perPage: number;
  private handleInsert: ((value: string | string[]) => void) | undefined;
  private currentQuery = '';

  constructor(provider: StockPhotoProvider, apiKey: string | undefined, perPage: number) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.perPage = perPage;

    this.container = createElement('div', 'decap-cms-stockphoto-modal');
    this.container.id = CONTAINER_ID;
    this.container.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'display:none',
      'background:rgba(0,0,0,0.5)',
    ].join(';');

    const panel = createElement('div', 'decap-cms-stockphoto-panel');
    panel.style.cssText = [
      'background:#fff',
      'max-width:900px',
      'margin:5vh auto',
      'padding:16px',
      'border-radius:4px',
      'max-height:88vh',
      'overflow:auto',
    ].join(';');

    const header = createElement('div', 'decap-cms-stockphoto-header');
    header.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px';

    this.searchInput = document.createElement('input');
    this.searchInput.type = 'search';
    this.searchInput.placeholder = `Search ${provider.name}…`;
    this.searchInput.style.cssText = 'flex:1;padding:8px';

    const searchButton = createElement('button', 'decap-cms-stockphoto-search', 'Search');
    searchButton.type = 'button';

    const closeButton = createElement('button', 'decap-cms-stockphoto-close', 'Close');
    closeButton.type = 'button';

    const runSearch = () => {
      this.currentQuery = this.searchInput.value.trim();
      if (this.currentQuery) this.search(this.currentQuery);
    };

    searchButton.addEventListener('click', runSearch);
    this.searchInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearch();
      }
    });
    closeButton.addEventListener('click', () => this.close());

    header.append(this.searchInput, searchButton, closeButton);

    this.statusEl = createElement('div', 'decap-cms-stockphoto-status');
    this.resultsEl = createElement('div', 'decap-cms-stockphoto-results');
    this.resultsEl.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px';

    panel.append(header, this.statusEl, this.resultsEl);
    this.container.appendChild(panel);
    document.body.appendChild(this.container);
  }

  setHandleInsert(handleInsert?: (value: string | string[]) => void) {
    this.handleInsert = handleInsert;
  }

  open() {
    this.container.style.display = 'block';
  }

  close() {
    this.container.style.display = 'none';
  }

  private setStatus(message: string) {
    this.statusEl.textContent = message;
  }

  async search(query: string) {
    if (!this.apiKey) {
      this.setStatus(
        `No API key configured for the ${this.provider.name} stock photo provider. Set media_library.config.apiKey in your CMS config.`,
      );
      this.resultsEl.replaceChildren();
      return;
    }

    this.setStatus(`Searching ${this.provider.name}…`);
    this.resultsEl.replaceChildren();

    try {
      const { results } = await this.provider.search(query, {
        apiKey: this.apiKey,
        perPage: this.perPage,
      });
      this.renderResults(results);
      this.setStatus(results.length ? '' : `No results for "${query}".`);
    } catch (error: unknown) {
      this.setStatus(error instanceof Error ? error.message : 'Stock photo search failed.');
    }
  }

  private renderResults(results: StockPhotoResult[]) {
    this.resultsEl.replaceChildren();

    results.forEach(result => {
      const card = createElement('div', 'decap-cms-stockphoto-card');
      card.style.cssText = 'display:flex;flex-direction:column;gap:4px';

      const img = document.createElement('img');
      img.src = result.thumbUrl;
      img.alt = result.description || `Photo by ${result.photographerName}`;
      img.style.cssText = 'width:100%;height:100px;object-fit:cover;cursor:pointer';
      img.addEventListener('click', () => this.selectResult(result));

      const credit = createElement(
        'div',
        'decap-cms-stockphoto-credit',
        `Photo by ${result.photographerName} on ${result.providerName}`,
      );
      credit.style.cssText = 'font-size:11px;color:#666';

      card.append(img, credit);
      this.resultsEl.appendChild(card);
    });
  }

  private async selectResult(result: StockPhotoResult) {
    this.setStatus(`Downloading photo by ${result.photographerName}…`);
    try {
      const path = await downloadAndPersist(result);
      if (path) {
        this.handleInsert?.(path);
        this.setStatus('');
        this.close();
      } else {
        this.setStatus('Photo was downloaded but could not be inserted. Please try again.');
      }
    } catch (error: unknown) {
      this.setStatus(error instanceof Error ? error.message : 'Failed to insert stock photo.');
    }
  }
}

async function init({ options = {}, handleInsert }: InitArgs = {}) {
  const config = options.config ?? {};
  const providerName = config.provider || 'unsplash';
  const provider = getStockPhotoProvider(providerName);
  const perPage = config.perPage ?? 20;

  const modal = new StockPhotoModal(provider, config.apiKey, perPage);
  modal.setHandleInsert(handleInsert);

  return {
    show: (_args: ShowArgs = {}) => modal.open(),
    hide: () => modal.close(),
    onClearControl: () => {},
    onRemoveControl: () => {},
    enableStandalone: () => true,
  };
}

const stockPhotoMediaLibrary = { name: 'stockphoto', init };

export const DecapCmsMediaLibraryStockPhoto = stockPhotoMediaLibrary;
export { downloadAndPersist };
export default stockPhotoMediaLibrary;
