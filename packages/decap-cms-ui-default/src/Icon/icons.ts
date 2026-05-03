import mapValues from 'lodash/mapValues';

import images from './images/icons.generated';

import type { IconComponent, IconImages } from './images/icons.generated';

/**
 * This module outputs icon objects with the following shape:
 *
 * {
 *   image: <svg>...</svg>,
 *   ...props
 * }
 *
 * `props` here are config properties defined in this file for specific icons.
 * For example, an icon may face a specific direction, and the Icon component
 * accepts a `direction` prop to rotate directional icons, which relies on
 * defining the default direction here.
 */

export type IconDirection = 'left' | 'right' | 'up' | 'down';

export interface IconConfig {
  direction?: IconDirection;
}

export interface IconDefinition {
  image: IconComponent;
  direction?: IconDirection;
}

export type IconName = keyof IconImages;

export type Icons = {
  [K in IconName]: IconDefinition;
};

/**
 * Configuration for individual icons.
 */
const config: Partial<Record<IconName, IconConfig>> = {
  arrow: {
    direction: 'left',
  },
  chevron: {
    direction: 'down',
  },
  'chevron-double': {
    direction: 'down',
  },
};

/**
 * Map icon definition objects - imported object of images simply maps the icon
 * name to the raw svg, so we move that to the `image` property of the
 * definition object and set any additional configured properties for each icon.
 */
const icons = mapValues(images, (image: IconComponent, name: string): IconDefinition => {
  const props = config[name as IconName] || {};
  return { image, ...props };
}) as Icons;

export default icons;
