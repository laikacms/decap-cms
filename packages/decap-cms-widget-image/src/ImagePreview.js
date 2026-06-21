import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { List } from 'immutable';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

const StyledImage = styled(({ src, className }) => (
  <img src={src || ''} role="presentation" className={className} />
))`
  display: block;
  max-width: 100%;
  height: auto;
`;

function StyledImageAsset({ getAsset, value, field }) {
  const [asset, setAsset] = useState(null);

  useEffect(() => {
    if (!value) {
      setAsset(null);
      return;
    }

    if (typeof File !== 'undefined' && value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setAsset(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    }

    const newAsset = getAsset(value, field);
    setAsset(newAsset);
  }, [value, field, getAsset]);

  const fieldClass = field && field.get('class');
  return asset ? <StyledImage src={asset} className={fieldClass || undefined} /> : null;
}

function ImagePreviewContent(props) {
  const { value, getAsset, field } = props;
  if (Array.isArray(value) || List.isList(value)) {
    return value.map((val, index) => (
      <StyledImageAsset key={index} value={val} getAsset={getAsset} field={field} />
    ));
  }
  return <StyledImageAsset {...props} />;
}

function ImagePreview(props) {
  const tagname = props.field && props.field.get('tagname');
  const content = props.value ? <ImagePreviewContent {...props} /> : null;
  if (tagname) {
    return React.createElement(tagname, null, content);
  }
  return <WidgetPreviewContainer>{content}</WidgetPreviewContainer>;
}

ImagePreview.propTypes = {
  getAsset: PropTypes.func.isRequired,
  value: PropTypes.node,
  field: PropTypes.object,
};

export default ImagePreview;
