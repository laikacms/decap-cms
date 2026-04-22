import React from 'react';
import { translate } from 'react-polyglot';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type { EntryField } from 'decap-cms-lib-util/types/cms-immutable';

interface UnknownPreviewProps {
  field?: EntryField;
  t: TranslateFunction;
}

function UnknownPreview({ field, t }: UnknownPreviewProps) {
  return (
    <div className="nc-widgetPreview">
      {t('editor.editorWidgets.unknownPreview.noPreview', { widget: field?.get('widget') })}
    </div>
  );
}

UnknownPreview.propTypes = {
  field: ImmutablePropTypes.map,
  t: PropTypes.func.isRequired,
};

export default translate()(UnknownPreview);
