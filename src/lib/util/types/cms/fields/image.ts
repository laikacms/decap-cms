import type { CmsMediaLibrary } from '../media.js';

export interface CmsFieldImage {
  widget: 'image';
  default?: string;

  media_library?: CmsMediaLibrary;
  allow_multiple?: boolean;
  private?: boolean;
  config?: unknown;
}
