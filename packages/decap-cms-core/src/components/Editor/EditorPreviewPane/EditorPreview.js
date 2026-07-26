import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';

import { isVisible } from '../../../lib/widgets';

const PreviewContainer = styled.div`
  font-family: Roboto, 'Helvetica Neue', HelveticaNeue, Helvetica, Arial, sans-serif;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
`;

/**
 * Use a stateful component so that child components can effectively utilize
 * `shouldComponentUpdate`.
 */
export default class Preview extends React.Component {
  render() {
    const { collection, fields, widgetFor } = this.props;
    if (!collection || !fields) {
      return null;
    }
    return (
      <PreviewContainer>
        {fields.filter(isVisible).map(field => (
          <div key={field.get('name')}>{widgetFor(field.get('name'))}</div>
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
