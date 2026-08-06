import controlComponent from './BooleanControl';
import schema from './schema';

function Widget(opts = {}) {
  return {
    name: 'boolean',
    controlComponent,
    schema,
    ...opts,
  };
}

export const DecapCmsWidgetBoolean = { Widget, controlComponent };
export default DecapCmsWidgetBoolean;
