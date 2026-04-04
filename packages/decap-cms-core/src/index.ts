import bootstrap from './bootstrap';
import Registry from './lib/registry';

export type * from './types/cms';

export const DecapCmsCore = {
  ...Registry,
  init: bootstrap,
};
export default DecapCmsCore;
