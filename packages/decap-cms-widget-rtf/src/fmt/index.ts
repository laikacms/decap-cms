import { markdownConverter } from './markdown';
import { slateConverter } from './slate';

import type { FormatConverter } from './common';

const defaultFormatters: FormatConverter[] = [slateConverter, markdownConverter];

export function getFormat(
  providedFormatters: FormatConverter[],
  field: any,
): FormatConverter | undefined {
  const format = field.get('text_format', 'identity');
  const allFormatters = [...(providedFormatters || []), ...defaultFormatters];
  return allFormatters.find(fmt => fmt.formatName === format);
}
