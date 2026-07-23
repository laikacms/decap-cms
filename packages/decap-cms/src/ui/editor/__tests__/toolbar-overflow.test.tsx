import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { markdownMapper } from '@/format-packs/markdown';
import { registerMapper } from '@/lib/richtext';
import { Editor } from '@/ui/editor/Editor';

registerMapper(markdownMapper);

// DCMS-1512: at narrow (mobile) viewports both `role="toolbar"` rows in
// Editor.tsx overflow horizontally with zero visible cue and no way for a
// mouse-only user to reach the hidden controls. jsdom never performs real
// layout, so `scrollWidth`/`clientWidth` are stubbed on the toolbar node
// (matching the real 390px-viewport measurement from the issue: clientWidth
// 312, scrollWidth 1217) and a `scroll` event is fired to make
// `useScrollOverflow` recompute — mirroring how the real ResizeObserver path
// reacts to layout changes.
function stubOverflow(element: HTMLElement, { clientWidth, scrollWidth, scrollLeft = 0 }: {
  clientWidth: number;
  scrollWidth: number;
  scrollLeft?: number;
}) {
  Object.defineProperty(element, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(element, 'scrollLeft', { value: scrollLeft, configurable: true, writable: true });
  fireEvent.scroll(element);
}

describe('richtext editor toolbar overflow affordance', () => {
  it('surfaces a visible affordance + reachable control when the "Text formatting" toolbar overflows', async () => {
    const { container } = render(
      <div style={{ width: 390 }}>
        <Editor format="markdown" />
      </div>,
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Text formatting' });
    expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');

    // Before any overflow is detected, no scroll affordance is rendered.
    expect(toolbar).not.toHaveAttribute('data-overflow');
    expect(
      screen.queryByRole('button', { name: 'Show more formatting options' }),
    ).not.toBeInTheDocument();

    stubOverflow(toolbar, { clientWidth: 312, scrollWidth: 1217 });

    expect(toolbar).toHaveAttribute('data-overflow', 'right');
    const showMoreButton = screen.getByRole('button', { name: 'Show more formatting options' });
    expect(showMoreButton).toBeVisible();
    expect(container.querySelectorAll('[role="toolbar"][aria-label="Text formatting"]')).toHaveLength(1);
  });

  it('carries aria-orientation="horizontal" on the "Editor actions" toolbar too', () => {
    render(<Editor format="markdown" />);

    const toolbar = screen.getByRole('toolbar', { name: 'Editor actions' });
    expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');

    stubOverflow(toolbar, { clientWidth: 312, scrollWidth: 488 });

    expect(toolbar).toHaveAttribute('data-overflow', 'right');
    expect(screen.getByRole('button', { name: 'Show more editor actions' })).toBeVisible();
  });
});
