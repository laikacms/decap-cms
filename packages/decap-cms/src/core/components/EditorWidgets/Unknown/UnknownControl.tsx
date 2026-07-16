import React from 'react';

import { translate } from '@/core/i18n';

import type { CmsEntryField } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

type EntryField = CmsEntryField;

interface UnknownControlProps {
  field?: EntryField;
  t: TranslateFunction;
}

function UnknownControl({ field, t }: UnknownControlProps) {
  return <div>{t('editor.editorWidgets.unknownControl.noControl', { widget: field?.widget })}</div>;
}

export default translate()(UnknownControl);
