import React from 'react';
import { translate } from 'react-polyglot';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { CmsEntryField } from 'decap-cms-lib-util';

type EntryField = CmsEntryField;

interface UnknownControlProps {
  field?: EntryField;
  t: TranslateFunction;
}

function UnknownControl({ field, t }: UnknownControlProps) {
  return <div>{t('editor.editorWidgets.unknownControl.noControl', { widget: field?.widget })}</div>;
}

export default translate()(UnknownControl);
