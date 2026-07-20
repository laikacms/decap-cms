import type React from 'react';
import type { DecapCmsApp, init } from './index';

declare global {
  interface Window {
    CMS_MANUAL_INIT: boolean | undefined;
    CMS: typeof DecapCmsApp;
    initCMS: typeof init;
    h: typeof React.createElement;
  }
}
