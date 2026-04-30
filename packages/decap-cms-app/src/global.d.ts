import type { CMS } from 'decap-cms-core';

declare global {
  interface Window {
    DECAP_CMS_APP_VERSION: string | undefined;
    DECAP_CMS_VERSION: string | undefined;
    CMS_MANUAL_INIT: boolean | undefined;
    CMS: typeof CMS;
    initCMS: typeof CMS.init;
    h: typeof React.createElement;
  }
}
