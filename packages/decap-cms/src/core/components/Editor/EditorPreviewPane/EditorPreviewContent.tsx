import { vercelStegaDecode } from '@vercel/stega';
import React from 'react';
import { FrameContextConsumer } from 'react-frame-component';

import { ScrollSyncPane } from '@/ui';

import type { FrameContextProps } from 'react-frame-component';

/**
 * PreviewContent renders the preview component and optionally handles visual editing interactions.
 * By default it uses scroll sync, but can be configured to use visual editing instead.
 */
interface PreviewContentProps {
  previewComponent: React.ComponentType<Record<string, unknown>> | React.ReactElement;
  previewProps?: Record<string, any>;
  onFieldClick?: ((fieldName: string) => void) | undefined;
  /**
   * DCMS-2134: footprint (CSS px) of the view-controls icon row + assistant
   * pill that float over this pane's top-right corner, measured by
   * `EditorInterface`. Rendered as a right-floated, zero-content spacer
   * ahead of the actual preview markup so the browser's own text-wrap
   * algorithm reserves that corner — the same way text wraps around a
   * floated image — instead of the chrome painting over content that
   * doesn't know it's there.
   */
  chromeReserve?: { width: number, height: number } | undefined;
}

function PreviewContent({ previewComponent, previewProps, onFieldClick, chromeReserve }: PreviewContentProps) {
  const visualEditing = (previewProps?.collection as any)?.editor?.visualEditing ?? false;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!visualEditing) return;
    try {
      const text = (e.target as HTMLElement).textContent;
      const decoded = vercelStegaDecode(text ?? '') as Record<string, any>;
      if (decoded?.decap && onFieldClick) {
        onFieldClick(decoded.decap);
      }
    } catch (err: unknown) {
      console.log('Visual editing error:', err);
    }
  }

  function renderPreview() {
    const isValidComponent = React.isValidElement(previewComponent)
      || typeof previewComponent === 'function'
      || (typeof previewComponent === 'object' && previewComponent !== null);

    if (!isValidComponent) {
      console.warn(
        `Invalid preview component: expected a React component or element but received ${typeof previewComponent}. `
          + `The preview will not be rendered.`,
      );
      return <div onClick={handleClick} />;
    }

    return (
      <div
        onClick={handleClick}
        // DCMS-NEW-PREVIEW-WRAP: belt-and-braces alongside the iframe's
        // base <style> — a custom preview component may reset its own
        // wrap/word-break, so re-assert it on the immediate content
        // wrapper too rather than relying solely on inheritance.
        style={{ maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
      >
        {chromeReserve && chromeReserve.width > 0 && chromeReserve.height > 0 && (
          <div
            aria-hidden="true"
            data-testid="preview-chrome-reserve"
            style={{
              float: 'right',
              width: chromeReserve.width,
              height: chromeReserve.height,
              pointerEvents: 'none',
            }}
          />
        )}
        {React.isValidElement(previewComponent)
          ? React.cloneElement(previewComponent, previewProps)
          : React.createElement(
            previewComponent as React.ComponentType<Record<string, unknown>>,
            previewProps,
          )}
      </div>
    );
  }

  const showScrollSync = !visualEditing;

  return (
    <FrameContextConsumer>
      {(context: FrameContextProps) => {
        const preview = renderPreview();
        if (showScrollSync) {
          return (
            <ScrollSyncPane attachTo={context?.document?.scrollingElement as HTMLElement | null}>
              {preview}
            </ScrollSyncPane>
          );
        }
        return preview;
      }}
    </FrameContextConsumer>
  );
}

export default PreviewContent;
