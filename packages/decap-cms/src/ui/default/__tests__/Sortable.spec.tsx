import { render } from '@testing-library/react';
import React from 'react';
import { describe, it } from 'vitest';

import { SortableArea, SortableItem } from '@/ui/default/Sortable';

function Area({ items }: { items: string[] }) {
  return (
    <SortableArea onSortEnd={() => {}}>
      {items.map((label, index) => (
        <SortableItem key={label} index={index}>
          {ref => <div ref={ref}>{label}</div>}
        </SortableItem>
      ))}
    </SortableArea>
  );
}

/**
 * Memoized so the first area does NOT re-render in the commit that mounts
 * the second one — that is essential to the repro below. If the first area
 * re-renders alongside the new mount, react-dnd re-singletonizes and the
 * bug hides.
 */
const FirstArea = React.memo(function FirstArea() {
  return <Area items={['a1', 'a2']} />;
});

/**
 * Regression test for "Cannot have two HTML5 backends at the same time".
 *
 * react-dnd's global-singleton path (`DndProvider` given only a `backend`)
 * breaks under React StrictMode: the double-invoked ref-count effect nulls
 * the window-level manager singleton while the first provider still holds
 * its manager. A `SortableArea` that then mounted in a commit where the
 * first area did not re-render (independent widgets — the normal case in
 * the CMS) created a second manager, and its HTML5 backend setup threw as
 * soon as both managers had registered drag sources. Sharing one explicit
 * manager via `getDndManager` bypasses that path.
 *
 * A crash here surfaces as a test failure from the rerender; no try/catch
 * wrapper, because the throw can be delivered outside the rerender call.
 */
describe('SortableArea - shared drag-and-drop manager', () => {
  it('mounts a second area without re-rendering the first, under StrictMode, without crashing', () => {
    const { rerender, getByText } = render(
      <React.StrictMode>
        <FirstArea />
      </React.StrictMode>,
    );
    getByText('a1');

    rerender(
      <React.StrictMode>
        <FirstArea />
        <Area items={['b1', 'b2']} />
      </React.StrictMode>,
    );
    getByText('b1');
  });
});
