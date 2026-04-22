import bootstrap from './bootstrap';
import Registry from './lib/registry';

export type * from 'decap-cms-lib-util/types/cms';

export const DecapCmsCore = {
  ...Registry,
  init: bootstrap,
};
export default DecapCmsCore;
