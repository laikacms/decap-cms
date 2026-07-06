import React from 'react';
import { translate } from 'react-polyglot';
import PropTypes from 'prop-types';

function UnknownPreview({ field, t }) {
  return (
    <div className="nc-widgetPreview">
      {t('editor.editorWidgets.unknownPreview.noPreview', { widget: field.widget })}
    </div>
  );
}

UnknownPreview.propTypes = {
  field: PropTypes.object,
  t: PropTypes.func.isRequired,
};

export default translate()(UnknownPreview);
