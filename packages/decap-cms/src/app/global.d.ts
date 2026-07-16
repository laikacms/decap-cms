import type React from 'react';
import type { DecapCmsApp, init } from './index';

declare global {
  interface Window {
    DECAP_CMS_APP_VERSION: string | undefined;
    DECAP_CMS_VERSION: string | undefined;
    DECAP_CMS_CORE_VERSION: string | undefined;
    CMS_MANUAL_INIT: boolean | undefined;
    CMS: typeof DecapCmsApp;
    initCMS: typeof init;
    h: typeof React.createElement;
  }
}
