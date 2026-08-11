import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, UNDO_COMMAND } from 'lexical';
import { useEffect, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { $createBlockNode, $isBlockNode, BlockNode } from '@/lib/richtext/blocks/BlockNode';
import { BlockComponent } from '@/lib/richtext/blocks/BlockComponent';
import { BlocksProvider } from '@/lib/richtext/blocks/blocksContext';
import { HISTORY_COALESCE_WINDOW_MS } from '@/lib/richtext/blocks/historyCoalesce';

import type { NodeKey } from 'lexical';
import type { ReactNode } from 'react';
import type { BlockChromeProps, BlockData, BlocksConfig } from '@/lib/richtext/blocks/types';

/**
 * DCMS-2013: `BlockComponent` is the single render seam for custom blocks
 * inside the Lexical editor. It owns `updateData` (writes prop edits back
 * onto the underlying `BlockNode`) and the history-coalescing decision that
 * folds rapid successive edits to the same block into one undo entry
 * (DCMS-1489, see `historyCoalesce.ts` and `historyCoalesceIntegration.spec.ts`
 * for the equivalent pure-logic-vs-real-history proof). These specs exercise
 * the same behavior through the actual rendered component.
 *
 * `BlockComponent` normally reaches the DOM via `BlockNode.decorate()`
 * (portal-rendered inside the composer tree by Lexical's reconciler). This
 * harness renders it directly inside a minimal `LexicalComposer` +
 * `HistoryPlugin` tree instead of the full `Editor` (which pulls in the
 * entire toolbar/plugin stack) — `BlockComponent` only needs
 * `useLexicalComposerContext`/`useLexicalNodeSelection`, both satisfied by
 * the composer context alone. A `registerUpdateListener` re-reads the node's
 * `data` on every commit and feeds it back in as a fresh `data` prop, the
 * same way Lexical's reconciler re-invokes `decorate()` after a commit.
 */

function TestChrome(props: BlockChromeProps): ReactNode {
  return (
    <div>
      <span data-testid="count">{String((props.data.count as number | undefined) ?? 0)}</span>
      <button
        type="button"
        onClick={() => props.updateData({ count: ((props.data.count as number | undefined) ?? 0) + 1 })}
      >
        bump
      </button>
    </div>
  );
}

function UndoButton(): ReactNode {
  const [editor] = useLexicalComposerContext();
  return (
    <button type="button" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
      undo
    </button>
  );
}

function Harness({ blocksConfig }: { blocksConfig: BlocksConfig }) {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState<{ nodeKey: NodeKey, data: BlockData } | null>(null);

  useEffect(() => {
    editor.update(
      () => {
        const node = $createBlockNode('widget', { count: 0 });
        $getRoot().append(node);
        setState({ nodeKey: node.getKey(), data: node.getData() });
      },
      { discrete: true },
    );

    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const node = $getRoot().getChildren().find($isBlockNode);
        if (node) setState({ nodeKey: node.getKey(), data: node.getData() });
      });
    });
  }, [editor]);

  if (!state) return null;

  return (
    <BlocksProvider value={blocksConfig}>
      <BlockComponent componentId="widget" data={state.data} nodeKey={state.nodeKey} />
      <UndoButton />
    </BlocksProvider>
  );
}

function renderHarness(blocksConfig: BlocksConfig) {
  return render(
    <LexicalComposer
      initialConfig={{
        namespace: 'block-component-test',
        nodes: [BlockNode],
        onError(error) {
          throw error;
        },
      }}
    >
      <HistoryPlugin />
      <Harness blocksConfig={blocksConfig} />
    </LexicalComposer>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BlockComponent updateData', () => {
  it('invokes renderBlockChrome with the current data and writes edits back onto the node', async () => {
    renderHarness({ renderBlockChrome: TestChrome });

    expect(screen.getByTestId('count').textContent).toBe('0');

    fireEvent.click(screen.getByText('bump'));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));

    fireEvent.click(screen.getByText('bump'));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
  });

  it('falls back to a read-only label when no renderBlockChrome is configured', () => {
    renderHarness({ blocks: { widget: { id: 'widget', label: 'Widget', fields: [] } } });

    expect(screen.getByText('[Widget]')).toBeInTheDocument();
  });
});

describe('BlockComponent history coalescing (DCMS-1489)', () => {
  it('collapses rapid successive edits into one undo entry', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now');
    let now = 10_000;
    dateNowSpy.mockImplementation(() => now);

    renderHarness({ renderBlockChrome: TestChrome });
    const bump = screen.getByText('bump');
    const undo = screen.getByText('undo');

    fireEvent.click(bump); // count -> 1, first edit: not coalesced, pushes a new entry
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    now += 100;
    fireEvent.click(bump); // count -> 2, coalesces into the same entry
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    now += 100;
    fireEvent.click(bump); // count -> 3, coalesces into the same entry
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));

    fireEvent.click(undo); // undoes the single merged entry
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'));
  });

  it('starts a new undo entry once the coalescing window elapses', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now');
    let now = 10_000;
    dateNowSpy.mockImplementation(() => now);

    renderHarness({ renderBlockChrome: TestChrome });
    const bump = screen.getByText('bump');
    const undo = screen.getByText('undo');

    fireEvent.click(bump); // count -> 1 (entry #1)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    now += 100;
    fireEvent.click(bump); // count -> 2, merges into entry #1
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));

    now += HISTORY_COALESCE_WINDOW_MS + 1; // past the coalescing window
    fireEvent.click(bump); // count -> 3, starts entry #2
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('3'));

    fireEvent.click(undo); // undoes only entry #2
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));

    fireEvent.click(undo); // undoes entry #1
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'));
  });

  it('starts a new undo entry when edits move to a different block', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now');
    let now = 10_000;
    dateNowSpy.mockImplementation(() => now);

    function TwoBlocks({ blocksConfig }: { blocksConfig: BlocksConfig }) {
      const [editor] = useLexicalComposerContext();
      const [keys, setKeys] = useState<[NodeKey, NodeKey] | null>(null);
      const [dataA, setDataA] = useState<BlockData>({ count: 0 });
      const [dataB, setDataB] = useState<BlockData>({ count: 0 });

      useEffect(() => {
        editor.update(
          () => {
            const a = $createBlockNode('widget', { count: 0 });
            const b = $createBlockNode('widget', { count: 0 });
            $getRoot().append(a, b);
            setKeys([a.getKey(), b.getKey()]);
          },
          { discrete: true },
        );

        return editor.registerUpdateListener(({ editorState }) => {
          editorState.read(() => {
            const [first, second] = $getRoot().getChildren().filter($isBlockNode);
            if (first) setDataA(first.getData());
            if (second) setDataB(second.getData());
          });
        });
      }, [editor]);

      if (!keys) return null;
      return (
        <BlocksProvider value={blocksConfig}>
          <div data-testid="block-a">
            <BlockComponent componentId="widget" data={dataA} nodeKey={keys[0]} />
          </div>
          <div data-testid="block-b">
            <BlockComponent componentId="widget" data={dataB} nodeKey={keys[1]} />
          </div>
          <UndoButton />
        </BlocksProvider>
      );
    }

    render(
      <LexicalComposer
        initialConfig={{
          namespace: 'block-component-test-two',
          nodes: [BlockNode],
          onError(error) {
            throw error;
          },
        }}
      >
        <HistoryPlugin />
        <TwoBlocks blocksConfig={{ renderBlockChrome: TestChrome }} />
      </LexicalComposer>,
    );

    const blockA = screen.getByTestId('block-a');
    const blockB = screen.getByTestId('block-b');
    const undo = screen.getByText('undo');

    fireEvent.click(blockA.querySelector('button')!); // A: 0 -> 1 (entry #1)
    await waitFor(() => expect(blockA.querySelector('[data-testid="count"]')?.textContent).toBe('1'));
    now += 50;
    fireEvent.click(blockA.querySelector('button')!); // A: 1 -> 2, merges into entry #1
    await waitFor(() => expect(blockA.querySelector('[data-testid="count"]')?.textContent).toBe('2'));

    now += 50;
    fireEvent.click(blockB.querySelector('button')!); // B: 0 -> 1, different node -> entry #2
    await waitFor(() => expect(blockB.querySelector('[data-testid="count"]')?.textContent).toBe('1'));

    expect(blockA.querySelector('[data-testid="count"]')?.textContent).toBe('2');

    fireEvent.click(undo); // undoes only entry #2 (block B)
    await waitFor(() => expect(blockB.querySelector('[data-testid="count"]')?.textContent).toBe('0'));
    expect(blockA.querySelector('[data-testid="count"]')?.textContent).toBe('2');

    fireEvent.click(undo); // undoes entry #1 (block A)
    await waitFor(() => expect(blockA.querySelector('[data-testid="count"]')?.textContent).toBe('0'));
  });
});
