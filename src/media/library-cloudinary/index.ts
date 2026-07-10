import pick from 'lodash/pick';

import { loadScript } from '../../lib/util/index';

declare global {
  interface Window {
    cloudinary: {
      createMediaLibrary(
        config: Record<string, unknown>,
        callbacks: { insertHandler: (data: { assets: CloudinaryAsset[] }) => void },
      ): { show(config?: Record<string, unknown>): void; hide(): void };
    };
  }
}

type CloudinaryAsset = {
  public_id: string;
  format: string;
  derived?: { secure_url: string; url: string }[];
  secure_url: string;
  url: string;
};

type CloudinaryOptions = {
  use_secure_url?: boolean;
  use_transformations?: boolean;
  output_filename_only?: boolean;
};

const defaultOptions: Required<CloudinaryOptions> = {
  use_secure_url: true,
  use_transformations: true,
  output_filename_only: false,
};

const enforcedConfig = {
  button_class: undefined as undefined,
  inline_container: undefined as undefined,
  insert_transformation: false,
  z_index: '99999',
};

const defaultConfig = {
  multiple: false,
};

function getAssetUrl(
  asset: CloudinaryAsset,
  { use_secure_url, use_transformations, output_filename_only }: Required<CloudinaryOptions>,
) {
  if (output_filename_only) {
    return `${asset.public_id}.${asset.format}`;
  }

  const urlObject = asset.derived && use_transformations ? asset.derived[0] : asset;
  const urlKey = use_secure_url ? 'secure_url' : 'url';

  return urlObject[urlKey];
}

type InitConfig = Record<string, unknown> & {
  multiple?: boolean;
  default_transformations?: unknown;
  max_files?: number;
};

async function init({
  options = {},
  handleInsert,
}: {
  options?: { config?: InitConfig } & CloudinaryOptions;
  handleInsert?: (value: string | string[]) => void;
} = {}) {
  const { config: providedConfig = {}, ...integrationOptions } = options;
  const resolvedOptions: Required<CloudinaryOptions> = { ...defaultOptions, ...integrationOptions };
  const cloudinaryConfig = { ...defaultConfig, ...providedConfig, ...enforcedConfig };
  const cloudinaryBehaviorConfigKeys = ['default_transformations', 'max_files', 'multiple'];
  const cloudinaryBehaviorConfig = pick(cloudinaryConfig, cloudinaryBehaviorConfigKeys);

  await loadScript('https://media-library.cloudinary.com/global/all.js');

  function insertHandler(data: { assets: CloudinaryAsset[] }) {
    const assets = data.assets.map(asset => getAssetUrl(asset, resolvedOptions));
    handleInsert?.(providedConfig.multiple || assets.length > 1 ? assets : assets[0]);
  }

  const mediaLibrary = window.cloudinary.createMediaLibrary(cloudinaryConfig, { insertHandler });

  return {
    show: ({
      config: instanceConfig = {},
      allowMultiple,
    }: {
      config?: Record<string, unknown>;
      allowMultiple?: boolean;
    } = {}) => {
      if (allowMultiple === false) {
        (instanceConfig as { multiple?: boolean }).multiple = false;
      }
      return mediaLibrary.show({ ...cloudinaryBehaviorConfig, ...instanceConfig });
    },
    hide: () => mediaLibrary.hide(),
    enableStandalone: () => true,
  };
}

const cloudinaryMediaLibrary = { name: 'cloudinary', init };

export const DecapCmsMediaLibraryCloudinary = cloudinaryMediaLibrary;
export default cloudinaryMediaLibrary;
