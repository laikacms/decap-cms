import DecapCmsWidgetObject from '../widget-object/index';
import controlComponent from './ListControl';
import schema from './schema';

const previewComponent = DecapCmsWidgetObject.previewComponent;

function Widget(opts = {}) {
  return {
    name: 'list',
    controlComponent,
    previewComponent,
    schema,
    ...opts,
  };
}

export const DecapCmsWidgetList = { Widget, controlComponent, previewComponent };
export default DecapCmsWidgetList;
