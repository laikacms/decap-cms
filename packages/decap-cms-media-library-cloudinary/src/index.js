import pick from 'lodash/pick';
import { loadScript } from 'decap-cms-lib-util';

const defaultOptions = {
  use_secure_url: true,
  use_transformations: true,
  output_filename_only: false,
};
/**
 * This configuration hash cannot be overridden, as the values here are required
 * for the integration to work properly.
 */
const enforcedConfig = {
  button_class: undefined,
  inline_container: undefined,
  insert_transformation: false,
  z_index: '99999',
};

const defaultConfig = {
  multiple: false,
};

function getAssetUrl(asset, { use_secure_url, use_transformations, output_filename_only }) {
  /**
   * Allow output of the file name only, in which case the rest of the url (including)
   * transformations) can be handled by the static site generator.
   */
  if (output_filename_only) {
    return `${asset.public_id}.${asset.format}`;
  }

  /**
   * Get url from `derived` property if it exists. This property contains the
   * transformed version of image if transformations have been applied.
   */
  const urlObject = asset.derived && use_transformations ? asset.derived[0] : asset;

  /**
   * Retrieve the `https` variant of the image url if the `useSecureUrl` option
   * is set to `true` (this is the default setting).
   */
  const urlKey = use_secure_url ? 'secure_url' : 'url';

  return urlObject[urlKey];
}

async function init({ options = {}, handleInsert } = {}) {
  /**
   * Configuration is specific to Cloudinary, while options are specific to this
   * integration.
   */
  const { config: providedConfig = {}, ...integrationOptions } = options;
  const globalOptions = { ...defaultOptions, ...integrationOptions };
  /**
   * The options actually used to build inserted asset URLs. Reassigned on each
   * `show()` call so a field-level override is in effect by the time the user
   * picks an asset, since `insertHandler` is only ever created once below.
   */
  let resolvedOptions = globalOptions;
  const cloudinaryConfig = { ...defaultConfig, ...providedConfig, ...enforcedConfig };
  const cloudinaryBehaviorConfigKeys = ['default_transformations', 'max_files', 'multiple'];
  const cloudinaryBehaviorConfig = pick(cloudinaryConfig, cloudinaryBehaviorConfigKeys);
  /**
   * Keys documented as overridable per-field, same shape as the global
   * `media_library` options.
   */
  const fieldOverridableOptionKeys = [
    'output_filename_only',
    'use_transformations',
    'use_secure_url',
  ];

  await loadScript('https://media-library.cloudinary.com/global/all.js');

  function insertHandler(data) {
    const assets = data.assets.map(asset => getAssetUrl(asset, resolvedOptions));
    handleInsert(providedConfig.multiple || assets.length > 1 ? assets : assets[0]);
  }

  const mediaLibrary = window.cloudinary.createMediaLibrary(cloudinaryConfig, { insertHandler });

  return {
    show: ({ config: instanceConfig = {}, allowMultiple, options: fieldOptions = {} } = {}) => {
      /**
       * Ensure multiple selection is not available if the field is configured
       * to disallow it.
       */
      if (allowMultiple === false) {
        instanceConfig.multiple = false;
      }
      /**
       * Field-level `output_filename_only`/`use_transformations`/`use_secure_url`
       * override the global values set at `init()` time.
       */
      resolvedOptions = { ...globalOptions, ...pick(fieldOptions, fieldOverridableOptionKeys) };
      return mediaLibrary.show({ ...cloudinaryBehaviorConfig, ...instanceConfig });
    },
    hide: () => mediaLibrary.hide(),
    enableStandalone: () => true,
  };
}

const cloudinaryMediaLibrary = { name: 'cloudinary', init };

export const DecapCmsMediaLibraryCloudinary = cloudinaryMediaLibrary;
export default cloudinaryMediaLibrary;
