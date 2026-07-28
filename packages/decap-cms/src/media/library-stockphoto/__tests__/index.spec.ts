import { beforeEach, describe, expect, it, vi } from 'vitest';

const dispatchMock = vi.fn();
const persistMediaMock = vi.fn((file: File, opts: unknown) => ({ type: 'PERSIST_MEDIA_THUNK', file, opts }));

vi.mock('@/core/redux', () => ({
  store: { dispatch: (...args: unknown[]) => dispatchMock(...args) },
}));

vi.mock('@/core/actions/mediaLibrary', () => ({
  persistMedia: (...args: Parameters<typeof persistMediaMock>) => persistMediaMock(...args),
}));

const searchMock = vi.fn();

vi.mock('@/media/library-stockphoto/providers', () => ({
  getStockPhotoProvider: vi.fn(() => ({ name: 'unsplash', search: searchMock })),
}));

import stockPhotoMediaLibrary from '@/media/library-stockphoto/index';

const sampleResult = {
  id: 'photo-1',
  thumbUrl: 'https://example.com/thumb.jpg',
  fullUrl: 'https://example.com/regular.jpg',
  downloadUrl: 'https://example.com/full.jpg',
  description: 'A mountain',
  photographerName: 'Jane Doe',
  photographerUrl: 'https://unsplash.com/@jane',
  providerName: 'Unsplash',
  providerUrl: 'https://unsplash.com/photos/photo-1',
  width: 800,
  height: 600,
};

describe('stockPhotoMediaLibrary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    dispatchMock.mockReset();
    persistMediaMock.mockClear();
    searchMock.mockReset();
  });

  it('is registered under the name "stockphoto"', () => {
    expect(stockPhotoMediaLibrary.name).toBe('stockphoto');
  });

  it('show()/hide() toggle the modal visibility and enableStandalone() is true', async () => {
    const instance = await stockPhotoMediaLibrary.init({
      options: { config: { apiKey: 'test-key' } },
      handleInsert: vi.fn(),
    });

    expect(instance.enableStandalone()).toBe(true);

    const modal = document.getElementById('decap-cms-stockphoto-library') as HTMLDivElement;
    expect(modal.style.display).toBe('none');

    instance.show({});
    expect(modal.style.display).toBe('block');

    instance.hide();
    expect(modal.style.display).toBe('none');
  });

  it('searches the configured provider and renders results with attribution', async () => {
    searchMock.mockResolvedValue({ results: [sampleResult], totalPages: 1 });

    const instance = await stockPhotoMediaLibrary.init({
      options: { config: { apiKey: 'test-key' } },
      handleInsert: vi.fn(),
    });
    instance.show({});

    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'mountains';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    await vi.waitFor(() => expect(searchMock).toHaveBeenCalledWith('mountains', { apiKey: 'test-key', perPage: 20 }));
    await vi.waitFor(() => expect(document.querySelectorAll('img').length).toBe(1));

    expect(document.body.textContent).toContain('Photo by Jane Doe on Unsplash');
  });

  it('downloads the selected photo, persists it as a media asset, and inserts the returned path', async () => {
    searchMock.mockResolvedValue({ results: [sampleResult], totalPages: 1 });
    dispatchMock.mockResolvedValue({
      type: 'MEDIA_PERSIST_SUCCESS',
      payload: { file: { path: 'static/images/photo-1.jpg' } },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['fake-image-bytes'], { type: 'image/jpeg' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const handleInsert = vi.fn();
    const instance = await stockPhotoMediaLibrary.init({
      options: { config: { apiKey: 'test-key' } },
      handleInsert,
    });
    instance.show({});

    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'mountains';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await vi.waitFor(() => expect(document.querySelectorAll('img').length).toBe(1));

    const img = document.querySelector('img') as HTMLImageElement;
    img.dispatchEvent(new MouseEvent('click'));

    await vi.waitFor(() => expect(handleInsert).toHaveBeenCalledWith('static/images/photo-1.jpg'));

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/full.jpg');
    expect(persistMediaMock).toHaveBeenCalledTimes(1);
    const [persistedFile] = persistMediaMock.mock.calls[0];
    expect(persistedFile).toBeInstanceOf(File);
    expect(persistedFile.name).toBe('unsplash-photo-1.jpeg');

    const modal = document.getElementById('decap-cms-stockphoto-library') as HTMLDivElement;
    expect(modal.style.display).toBe('none');
  });

  it('shows a helpful message when no apiKey is configured', async () => {
    const instance = await stockPhotoMediaLibrary.init({ options: { config: {} }, handleInsert: vi.fn() });
    instance.show({});

    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'mountains';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('No API key configured for the unsplash stock photo provider')
    );
    expect(searchMock).not.toHaveBeenCalled();
  });
});
