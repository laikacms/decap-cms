import React from 'react';
import styled from '@emotion/styled';

import type { CmsCollectionState, CmsEntry, CmsEntryField } from 'decap-cms-lib-util';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;

function isVisible(field: EntryField) {
  return field.widget !== 'hidden';
}

const PreviewContainer = styled.div`
  font-family: Roboto, 'Helvetica Neue', HelveticaNeue, Helvetica, Arial, sans-serif;
`;

/**
 * Use a stateful component so that child components can effectively utilize
 * `shouldComponentUpdate`.
 */
interface PreviewProps {
  collection: Collection;
  entry: EntryMap;
  fields: EntryField[];
  getAsset: (asset: string) => { url: string; path: string; field?: EntryField };
  widgetFor: (
    name: string,
    fields?: EntryField[],
    values?: Record<string, unknown>,
    fieldsMetaData?: Record<string, unknown>,
  ) => React.ReactNode;
}

export default class Preview extends React.Component<PreviewProps> {
  render() {
    const { collection, fields, widgetFor } = this.props;
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
}

