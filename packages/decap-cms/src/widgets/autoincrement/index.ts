import controlComponent from './AutoincrementControl';
import previewComponent from './AutoincrementPreview';
import schema from './schema';

function Widget(opts = {}) {
  return {
    name: 'autoincrement',
    controlComponent,
    previewComponent,
    schema,
    ...opts,
  };
}

export const DecapCmsWidgetAutoincrement = { Widget, controlComponent, previewComponent };
export default DecapCmsWidgetAutoincrement;
