import { registerWidget } from '@/core/lib/registry';
import UnknownControl from './Unknown/UnknownControl';
import UnknownPreview from './Unknown/UnknownPreview';

registerWidget({
  name: 'unknown',
  controlComponent: UnknownControl as any,
  previewComponent: UnknownPreview as any,
});
