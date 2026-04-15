import React from 'react';
import { translate } from 'react-polyglot';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type { EntryField } from '../../../types/cms';

interface UnknownControlProps {
  field?: EntryField;
  t: TranslateFunction;
}

function UnknownControl({ field, t }: UnknownControlProps) {
  return (
    <div>{t('editor.editorWidgets.unknownControl.noControl', { widget: field?.get('widget') })}</div>
  );
}

UnknownControl.propTypes = {
  field: ImmutablePropTypes.map,
  t: PropTypes.func.isRequired,
};

export default translate()(UnknownControl);
