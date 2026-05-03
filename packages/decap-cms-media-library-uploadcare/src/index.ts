import uploadcare from 'uploadcare-widget';
import uploadcareTabEffects from 'uploadcare-widget-tab-effects';

window.UPLOADCARE_LIVE = false;
window.UPLOADCARE_MANUAL_START = true;

const USER_AGENT = 'DecapCMS-Uploadcare-MediaLibrary';
const CDN_BASE_URL = 'https://ucarecdn.com';

const defaultConfig = {
  previewStep: true,
  integration: USER_AGENT,
};

function isFileGroup(files: string[]) {
  const basePatternString = `~${files.length}/nth/`;

  function mapExpression(_val: unknown, idx: number) {
    return new RegExp(`${basePatternString}${idx}/$`);
  }

  const expressions = Array.from({ length: files.length }, mapExpression);
  return expressions.every(exp => files.some(url => exp.test(url)));
}

function getFileGroup(files: string[]) {
  const groupId = new RegExp(`^.+/([^/]+~${files.length})/nth/`).exec(files[0])![1];
  return new Promise(resolve => uploadcare.loadFileGroup(groupId).done(group => resolve(group)));
}

function getFiles(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return isFileGroup(value) ? getFileGroup(value) : Promise.all(value.map(val => getFile(val)));
  }
  return value && typeof value === 'string' ? getFile(value) : null;
}

function getFile(url: string) {
  const groupPattern = /~\d+\/nth\/\d+\//;
  const uploaded = url.startsWith(CDN_BASE_URL) && !groupPattern.test(url);
  return uploadcare.fileFrom(uploaded ? 'uploaded' : 'url', url);
}

type Settings = {
  defaultOperations?: string;
  autoFilename?: boolean;
};

type FileInfo = {
  cdnUrl: string;
  name: string;
  isImage: boolean;
};

function openDialog({
  files,
  config,
  handleInsert,
  settings = {},
}: {
  files: unknown;
  config: Record<string, unknown>;
  handleInsert: (value: string | string[]) => void;
  settings?: Settings;
}) {
  if (settings.defaultOperations && !settings.defaultOperations.startsWith('/')) {
    console.warn(
      'Uploadcare default operations should start with `/`. Example: `/preview/-/resize/100x100/image.png`',
    );
  }

  function buildUrl(fileInfo: FileInfo) {
    const { cdnUrl, name, isImage } = fileInfo;

    let url =
      isImage && settings.defaultOperations ? `${cdnUrl}-${settings.defaultOperations}` : cdnUrl;
    const filenameDefined = !url.endsWith('/');

    if (!filenameDefined && settings.autoFilename) {
      url = url + name;
    }

    return url;
  }

  uploadcare.openDialog(files, config).done(({ promise, files: getFilesFromGroup }) => {
    const isGroup = Boolean(getFilesFromGroup);

    return promise().then(info => {
      if (isGroup && getFilesFromGroup) {
        return Promise.all(
          getFilesFromGroup().map(p => p.then(fileInfo => buildUrl(fileInfo as FileInfo))),
        ).then(urls => handleInsert(urls));
      } else {
        handleInsert(buildUrl(info as FileInfo));
      }
    });
  });
}

type InitOptions = {
  config?: Record<string, unknown> & { publicKey?: string };
  settings?: Settings;
};

async function init({
  options = { config: {}, settings: {} },
  handleInsert,
}: {
  options?: InitOptions;
  handleInsert?: (value: string | string[]) => void;
} = {}) {
  const { publicKey, ...globalConfig } = options.config ?? {};
  const baseConfig = { ...defaultConfig, ...globalConfig };

  window.UPLOADCARE_PUBLIC_KEY = publicKey as string | undefined;

  uploadcare.registerTab('preview', uploadcareTabEffects);

  return {
    show: ({
      value,
      config: instanceConfig = {},
      allowMultiple,
      imagesOnly = false,
    }: {
      value?: string | string[] | null;
      config?: Record<string, unknown>;
      allowMultiple?: boolean;
      imagesOnly?: boolean;
    } = {}) => {
      const config = { ...baseConfig, imagesOnly, ...instanceConfig };
      const multiple =
        allowMultiple === false ? false : !!(config as { multiple?: boolean }).multiple;
      const resolvedConfig = { ...config, multiple };
      const files = getFiles(value);

      if (files && !(files as { state?: unknown }).state) {
        return (files as Promise<unknown>).then(result =>
          openDialog({
            files: result,
            config: resolvedConfig,
            settings: options.settings,
            handleInsert: handleInsert ?? (() => undefined),
          }),
        );
      } else {
        return openDialog({
          files,
          config: resolvedConfig,
          settings: options.settings,
          handleInsert: handleInsert ?? (() => undefined),
        });
      }
    },

    enableStandalone: () => false,
  };
}

const uploadcareMediaLibrary = { name: 'uploadcare', init };

export const DecapCmsMediaLibraryUploadcare = uploadcareMediaLibrary;
export default uploadcareMediaLibrary;
