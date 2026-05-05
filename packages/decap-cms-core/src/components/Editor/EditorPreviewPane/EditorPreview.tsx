import React from 'react';
import styled from '@emotion/styled';

import type { CmsCollectionState, CmsEntry, CmsEntryField } from 'decap-cms-lib-util';

function isVisible(field: CmsEntryField) {
  return field.widget !== 'hidden';
}

const PreviewContainer = styled.div`
  font-family: Roboto, 'Helvetica Neue', HelveticaNeue, Helvetica, Arial, sans-serif;
`;

interface PreviewProps {
  collection: CmsCollectionState;
  entry: CmsEntry;
  fields: CmsEntryField[];
  getAsset: (asset: string) => { url: string; path: string; field?: CmsEntryField };
  widgetFor: (
    name: string,
    fields?: CmsEntryField[],
    values?: Record<string, unknown>,
    fieldsMetaData?: Record<string, unknown>,
  ) => React.ReactNode;
}

export default function Preview({ collection, fields, widgetFor }: PreviewProps) {
  if (!collection || !fields) {
    return null;
  }
  return (
    <PreviewContainer>
      {fields.filter(isVisible).map(field => (
        <div key={field.name}>{widgetFor(field.name)}</div>
      ))}
    </PreviewContainer>
  );
}

