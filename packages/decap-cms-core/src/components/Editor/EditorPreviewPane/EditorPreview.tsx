import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import type {
  CmsCollectionObject,
  CmsEntryMap,
  CmsEntryField,
} from 'decap-cms-lib-util/types/cms';

type Collection = CmsCollectionObject;
type EntryMap = CmsEntryMap;
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
  widgetFor: (name: string, fields?: EntryField[], values?: Record<string, unknown>, fieldsMetaData?: Record<string, unknown>) => React.ReactNode;
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

Preview.propTypes = {
  collection: ImmutablePropTypes.map.isRequired,
  entry: ImmutablePropTypes.map.isRequired,
  fields: ImmutablePropTypes.list.isRequired,
  getAsset: PropTypes.func.isRequired,
  widgetFor: PropTypes.func.isRequired,
};
