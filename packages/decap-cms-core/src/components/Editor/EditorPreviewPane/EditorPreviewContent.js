import PropTypes from 'prop-types';
import React from 'react';
import { isElement } from 'react-is';
import { ScrollSyncPane } from 'react-scroll-sync';
import { FrameContextConsumer } from 'react-frame-component';
import { vercelStegaDecode } from '@vercel/stega';

/**
 * PreviewContent renders the preview component and optionally handles visual editing interactions.
 * By default it uses scroll sync, but can be configured to use visual editing instead.
 */
class PreviewContent extends React.Component {
  handleClick = e => {
    const { previewProps, onFieldClick } = this.props;
    const visualEditing = previewProps?.collection?.getIn(['editor', 'visualEditing'], false);

    if (!visualEditing) {
      return;
    }

    try {
      const text = e.target.textContent;
      const decoded = vercelStegaDecode(text);
      if (decoded?.decap) {
        if (onFieldClick) {
          onFieldClick(decoded.decap);
        }
      }
    } catch (err) {
      console.log('Visual editing error:', err);
    }
  };

  renderPreview() {
    const { previewComponent, previewProps } = this.props;
    return (
      <div
        onClick={this.handleClick}
        // DCMS-1289: belt-and-braces alongside the iframe's base <style> —
        // a custom preview component may reset its own wrap/word-break, so
        // re-assert it on the immediate content wrapper too rather than
        // relying solely on inheritance.
        style={{ maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
      >
        {isElement(previewComponent)
          ? React.cloneElement(previewComponent, previewProps)
          : React.createElement(previewComponent, previewProps)}
      </div>
    );
  }

  render() {
    const { previewProps } = this.props;
    const visualEditing = previewProps?.collection?.getIn(['editor', 'visualEditing'], false);
    const showScrollSync = !visualEditing;

    return (
      <FrameContextConsumer>
        {context => {
          const preview = this.renderPreview();
          if (showScrollSync) {
            return (
              <ScrollSyncPane attachTo={context.document.scrollingElement}>
                {preview}
              </ScrollSyncPane>
            );
          }
          return preview;
        }}
      </FrameContextConsumer>
    );
  }
}

PreviewContent.propTypes = {
  previewComponent: PropTypes.func.isRequired,
  getEditorComponents: PropTypes.func,
  previewProps: PropTypes.object,
  onFieldClick: PropTypes.func,
};

export default PreviewContent;
