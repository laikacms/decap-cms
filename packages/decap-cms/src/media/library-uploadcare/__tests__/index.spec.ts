import uploadcare from 'uploadcare-widget';
import uploadcareTabEffects from 'uploadcare-widget-tab-effects';
import { v4 as uuid } from 'uuid';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';

import uploadcareMediaLibrary from '@/media/library-uploadcare/index';

function generateMockUrl({ count = 1, cdnUrl } = {}) {
  const baseUrl = 'https://ucarecdn.com';
  const url = `${baseUrl}/${uuid()}~${count}/`;
  const result = count === 1 ? `${url}nth/0/` : Array.from({ length: count }, (val, idx) => `${url}nth/${idx}/`);
  if (cdnUrl) {
    return { result, cdnUrl: url };
  }
  return result;
}

let openDialogCallback;

/**
 * Mock of the uploadcare widget object itself.
 */
vi.mock('uploadcare-widget', () => {
  const mockUploadcare = {
    registerTab: vi.fn(),
    openDialog: vi.fn(() => ({
      done: vi.fn(cb => {
        openDialogCallback = cb;
      }),
    })),
    fileFrom: vi.fn((type, url) =>
      Promise.resolve({
        testFileUrl: url,
      })
    ),
    loadFileGroup: () => ({
      done: cb => cb(),
    }),
  };
  return { default: mockUploadcare, ...mockUploadcare };
});

vi.mock('uploadcare-widget-tab-effects', () => ({ default: {} }));

describe('uploadcare media library', () => {
  let handleInsert;
  let simulateCloseDialog;
  const TEST_PUBLIC_KEY = 123;
  const defaultConfig = {
    imagesOnly: false,
    multiple: false,
    previewStep: true,
    integration: 'DecapCMS-Uploadcare-MediaLibrary',
  };

  beforeEach(() => {
    /**
     * Mock to manually call the close dialog registered callback.
     */
    simulateCloseDialog = (result, files) =>
      openDialogCallback({
        promise: () => Promise.resolve(result),
        ...(files ? { files: () => files.map(file => Promise.resolve(file)) } : {}),
      });

    /**
     * Spy to serve as the Decap CMS insertion handler.
     */
    handleInsert = vi.fn();
  });

  describe('initialization', () => {
    it('sets global required configuration', async () => {
      const options = {
        config: {
          publicKey: TEST_PUBLIC_KEY,
        },
      };
      await uploadcareMediaLibrary.init({ options });
      expect(window.UPLOADCARE_LIVE).toEqual(false);
      expect(window.UPLOADCARE_MANUAL_START).toEqual(true);
      expect(window.UPLOADCARE_PUBLIC_KEY).toEqual(TEST_PUBLIC_KEY);
    });

    it('registers the effects tab', async () => {
      await uploadcareMediaLibrary.init();
      expect(uploadcare.registerTab).toHaveBeenCalledWith('preview', uploadcareTabEffects);
    });
  });

  describe('widget configuration', () => {
    const options = {
      config: {
        foo: 'bar',
      },
    };

    it('has defaults', async () => {
      const integration = await uploadcareMediaLibrary.init();
      await integration.show();
      expect(uploadcare.openDialog).toHaveBeenCalledWith(null, defaultConfig);
    });

    it('can be defined globally', async () => {
      const expectedConfig = {
        ...defaultConfig,
        ...options.config,
      };
      const integration = await uploadcareMediaLibrary.init({ options });
      await integration.show();
      expect(uploadcare.openDialog).toHaveBeenCalledWith(null, expectedConfig);
    });

    it('can be defined per field', async () => {
      const expectedConfig = {
        ...defaultConfig,
        ...options.config,
      };
      const integration = await uploadcareMediaLibrary.init();
      await integration.show({ config: options.config });
      expect(uploadcare.openDialog).toHaveBeenCalledWith(null, expectedConfig);
    });
  });

  describe('show method', () => {
    const options = {
      config: {
        foo: 'bar',
      },
    };

    it('accepts imagesOnly as standalone property', async () => {
      const expectedConfig = {
        ...defaultConfig,
        ...options.config,
        imagesOnly: true,
      };
      const integration = await uploadcareMediaLibrary.init();
      await integration.show({ config: options.config, imagesOnly: true });
      expect(uploadcare.openDialog).toHaveBeenCalledWith(null, expectedConfig);
    });

    it('allows multiple selection if allowMultiple is not false', async () => {
      options.config.multiple = true;
      const expectedConfig = {
        ...defaultConfig,
        ...options.config,
        multiple: true,
      };
      const integration = await uploadcareMediaLibrary.init({ options });
      await integration.show({ config: options.config });
      expect(uploadcare.openDialog).toHaveBeenCalledWith(null, expectedConfig);
    });

    it('disallows multiple selection if allowMultiple is false', async () => {
      options.config.multiple = true;
      const expectedConfig = {
        ...defaultConfig,
        ...options.config,
        multiple: false,
      };
      const integration = await uploadcareMediaLibrary.init({ options });
      await integration.show({ config: options.config, allowMultiple: false });
      expect(uploadcare.openDialog).toHaveBeenCalledWith(null, expectedConfig);
    });

    // DCMS-591: allow_multiple being unset on the field must not force multiple: false
    // when the user explicitly set media_library.config.multiple: true. Only an explicit
    // allowMultiple === false (from an explicit allow_multiple: false) may override it.
    it('does not override an explicit config.multiple: true when allowMultiple is undefined', async () => {
      options.config.multiple = true;
      const expectedConfig = {
        ...defaultConfig,
        ...options.config,
        multiple: true,
      };
      const integration = await uploadcareMediaLibrary.init({ options });
      await integration.show({ config: options.config, allowMultiple: undefined });
      expect(uploadcare.openDialog).toHaveBeenCalledWith(null, expectedConfig);
    });

    it('passes selected image url to handleInsert', async () => {
      const url = generateMockUrl();
      const mockResult = { cdnUrl: url };
      const integration = await uploadcareMediaLibrary.init({ handleInsert });
      await integration.show();
      await simulateCloseDialog(mockResult);
      expect(handleInsert).toHaveBeenCalledWith(url);
    });

    it('passes multiple selected image urls to handleInsert', async () => {
      options.config.multiple = true;
      const { result, cdnUrl } = generateMockUrl({ count: 3, cdnUrl: true });
      const mockDialogCloseResult = { cdnUrl, count: 3 };
      const mockDialogCloseFiles = result.map((cdnUrl, idx) => ({
        cdnUrl,
        isImage: true,
        name: `test${idx}.png`,
      }));
      const integration = await uploadcareMediaLibrary.init({ options, handleInsert });
      await integration.show();
      await simulateCloseDialog(mockDialogCloseResult, mockDialogCloseFiles);
      expect(handleInsert).toHaveBeenCalledWith(result);
    });
  });

  describe('settings', () => {
    describe('defaultOperations', () => {
      it('should append specified string to the url', async () => {
        const options = {
          config: {
            publicKey: TEST_PUBLIC_KEY,
          },
          settings: {
            defaultOperations: '/preview/',
          },
        };
        const url = generateMockUrl();
        const mockResult = { cdnUrl: url, isImage: true };
        const integration = await uploadcareMediaLibrary.init({
          options,
          handleInsert,
        });
        await integration.show();
        await simulateCloseDialog(mockResult);
        expect(handleInsert).toHaveBeenCalledWith(url + '-/preview/');
      });

      it('should work along with `autoFilename` setting enabled', async () => {
        const options = {
          config: {
            publicKey: TEST_PUBLIC_KEY,
          },
          settings: {
            autoFilename: true,
            defaultOperations: '/preview/',
          },
        };
        const url = generateMockUrl();
        const mockResult = { cdnUrl: url, isImage: true, name: 'test.png' };
        const integration = await uploadcareMediaLibrary.init({
          options,
          handleInsert,
        });
        await integration.show();
        await simulateCloseDialog(mockResult);
        expect(handleInsert).toHaveBeenCalledWith(url + '-/preview/test.png');
      });

      it('should overwrite filename with `autoFilename` setting enabled', async () => {
        const options = {
          config: {
            publicKey: TEST_PUBLIC_KEY,
          },
          settings: {
            autoFilename: true,
            defaultOperations: '/preview/another_name.png',
          },
        };
        const url = generateMockUrl();
        const mockResult = { cdnUrl: url, isImage: true, name: 'test.png' };
        const integration = await uploadcareMediaLibrary.init({
          options,
          handleInsert,
        });
        await integration.show();
        await simulateCloseDialog(mockResult);
        expect(handleInsert).toHaveBeenCalledWith(url + '-/preview/another_name.png');
      });
    });

    describe('autoFilename', () => {
      it('should append filename to the url', async () => {
        const options = {
          config: {
            publicKey: TEST_PUBLIC_KEY,
          },
          settings: {
            autoFilename: true,
          },
        };
        const url = generateMockUrl();
        const mockResult = { cdnUrl: url, isImage: true, name: 'test.png' };
        const integration = await uploadcareMediaLibrary.init({
          options,
          handleInsert,
        });
        await integration.show();
        await simulateCloseDialog(mockResult);
        expect(handleInsert).toHaveBeenCalledWith(url + 'test.png');
      });
    });
  });

  describe('enableStandalone method', () => {
    it('returns false', async () => {
      const integration = await uploadcareMediaLibrary.init();
      expect(integration.enableStandalone()).toEqual(false);
    });
  });
});
