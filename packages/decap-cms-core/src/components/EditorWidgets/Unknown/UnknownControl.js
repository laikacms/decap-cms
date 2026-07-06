import React from 'react';
import { translate } from 'react-polyglot';
import PropTypes from 'prop-types';

function UnknownControl({ field, t }) {
  return (
    <div>{t('editor.editorWidgets.unknownControl.noControl', { widget: field.widget })}</div>
  );
}

UnknownControl.propTypes = {
  field: PropTypes.object,
  t: PropTypes.func.isRequired,
};

export default translate()(UnknownControl);
