import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';
import DOMPurify from 'dompurify';
import { Iterable, type List } from 'immutable';

import { getFormat } from './fmt/index';
import { htmlConverter } from './fmt/html';

import type { FormatConverter, SlateNode } from './fmt/common';

interface MarkdownPreviewProps {
  getAsset: (path: string) => string;
  resolveWidget: (widgetName: string) => React.ComponentType<any>;
  value?: string | List<SlateNode>;
  field?: any; // Immutable Map from Decap CMS
  getRemarkPlugins?: () => any[];
  textFormatters?: FormatConverter[];
}

class RichTextPreview extends React.Component<MarkdownPreviewProps> {
  static propTypes = {
    textFormatters: PropTypes.array,
    getAsset: PropTypes.func.isRequired,
    resolveWidget: PropTypes.func.isRequired,
    value: PropTypes.string,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(RichTextPreview.propTypes, this.props, 'prop', 'RichTextPreview');
  }

  render() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { value, getAsset, resolveWidget, textFormatters, field, getRemarkPlugins } = this.props;
    if (value === null || value === undefined) {
      return null;
    }

    const format = getFormat(textFormatters || [], field);

    // Convert this to separate rich-text formats
    const slate =
      format?.toSlate(Iterable.isIterable(value) ? (value as List<SlateNode>).toJS() : value) ||
      null;
    const html = slate ? htmlConverter.fromSlate(slate) : '';

    const toRender = field?.get('sanitize_preview', false) ? DOMPurify.sanitize(html) : html;

    return <WidgetPreviewContainer dangerouslySetInnerHTML={{ __html: toRender }} />;
  }
}

export default RichTextPreview;
