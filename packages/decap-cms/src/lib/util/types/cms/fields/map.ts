export type CmsMapWidgetType = 'Point' | 'LineString' | 'Polygon';

export interface CmsFieldMap {
  widget: 'map';
  default?: string;

  decimals?: number;
  type?: CmsMapWidgetType;
}
