import controlComponent from './ColorControl';
import previewComponent from './ColorPreview';
import schema from './schema';

function Widget(opts = {}) {
  return {
    name: 'color',
    controlComponent,
    previewComponent,
    schema,
    ...opts,
  };
}

export const DecapCmsWidgetColorString = { Widget, controlComponent, previewComponent };
export default DecapCmsWidgetColorString;
