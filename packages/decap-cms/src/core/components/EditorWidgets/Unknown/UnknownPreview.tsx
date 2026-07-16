import React from 'react';

import { translate } from '@/core/i18n';

import type { CmsEntryField } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

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
