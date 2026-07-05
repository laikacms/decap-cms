import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';

function isVisible(field) {
  return field.widget !== 'hidden';
}

const PreviewContainer = styled.div`
  font-family: Roboto, 'Helvetica Neue', HelveticaNeue, Helvetica, Arial, sans-serif;
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
          <div key={field.name}>{widgetFor(field.name)}</div>
        ))}
      </PreviewContainer>
    );
  }
}

Preview.propTypes = {
  collection: PropTypes.object.isRequired,
  entry: PropTypes.object.isRequired,
  fields: PropTypes.array.isRequired,
  getAsset: PropTypes.func.isRequired,
  widgetFor: PropTypes.func.isRequired,
};
