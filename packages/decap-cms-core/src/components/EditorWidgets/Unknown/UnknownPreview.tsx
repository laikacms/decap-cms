import React from 'react';
import { translate } from 'react-polyglot';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { CmsEntryField } from 'decap-cms-lib-util';

type EntryField = CmsEntryField;

interface UnknownPreviewProps {
  field?: EntryField;
  t: TranslateFunction;
}

function UnknownPreview({ field, t }: UnknownPreviewProps) {
  return (
    <div className="nc-widgetPreview">
      {t('editor.editorWidgets.unknownPreview.noPreview', { widget: field?.widget })}
    </div>
  );
}

export default translate()(UnknownPreview);
