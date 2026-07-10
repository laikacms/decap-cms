import DecapCmsWidgetFile from '../widget-file/index';
import previewComponent from './ImagePreview';
import schema from './schema';

const controlComponent = DecapCmsWidgetFile.withFileControl({ forImage: true });

function Widget(opts = {}) {
  return {
    name: 'image',
    controlComponent,
    previewComponent,
    schema,
    ...opts,
  };
}

export const DecapCmsWidgetImage = { Widget, controlComponent, previewComponent };
export default DecapCmsWidgetImage;
