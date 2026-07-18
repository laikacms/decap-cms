import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScrollSync, ScrollSyncPane } from '@/ui/ScrollSync';

/**
 * Behavior coverage for the `react-scroll-sync` vendored port (DCMS-682).
 * Mirrors the two-pane usage in `EditorInterface.tsx`: scrolling one pane
 * propagates the (proportional) scroll position to sibling panes in the
 * same group.
 */
describe('ScrollSync / ScrollSyncPane', () => {
  it('propagates scroll position from one pane to its sibling in the same group', () => {
    const { getByTestId } = render(
      <ScrollSync proportional={false}>
        <div>
          <ScrollSyncPane>
            <div data-testid="pane-a" style={{ overflow: 'auto', height: 100 }}>
              <div style={{ height: 1000 }} />
            </div>
          </ScrollSyncPane>
          <ScrollSyncPane>
            <div data-testid="pane-b" style={{ overflow: 'auto', height: 100 }}>
              <div style={{ height: 1000 }} />
            </div>
          </ScrollSyncPane>
        </div>
      </ScrollSync>,
    );

    const paneA = getByTestId('pane-a');
    const paneB = getByTestId('pane-b');

    Object.defineProperty(paneA, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(paneA, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(paneB, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(paneB, 'clientHeight', { value: 100, configurable: true });

    paneA.scrollTop = 250;
    fireEvent.scroll(paneA);

    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          expect(paneB.scrollTop).toBe(250);
          resolve();
        });
      });
    });
  });

  it('throws when ScrollSyncPane is used outside of a ScrollSync provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <ScrollSyncPane>
          <div>orphan pane</div>
        </ScrollSyncPane>,
      ),
    ).toThrow('useScrollSyncContext must be used within a ScrollSync');
    spy.mockRestore();
  });
});
