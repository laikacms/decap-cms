import controlComponent from './UuidControl';
import previewComponent from './UuidPreview';
import schema from './schema';

function Widget(opts = {}) {
  return {
    name: 'uuid',
    controlComponent,
    previewComponent,
    schema,
    ...opts,
  };
}

export const DecapCmsWidgetUuid = { Widget, controlComponent, previewComponent };
export default DecapCmsWidgetUuid;
