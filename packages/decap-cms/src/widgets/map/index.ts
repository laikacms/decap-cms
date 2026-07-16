import previewComponent from './MapPreview';
import schema from './schema';
import withMapControl from './withMapControl';

const controlComponent = withMapControl();

function Widget(opts = {}) {
  return {
    name: 'map',
    controlComponent,
    previewComponent,
    schema,
    ...opts,
  };
}

export const DecapCmsWidgetMap = { Widget, controlComponent, previewComponent };
export default DecapCmsWidgetMap;
