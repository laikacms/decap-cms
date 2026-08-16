import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EditorPanels from '@/core/components/Editor/EditorPanels';
import { getPanels, registerPanel, unregisterPanel } from '@/core/lib/registry';
import { CmsSlotsProvider } from '@/core/lib/slots';

import type { EditorPanel } from '@/core/lib/slots';
import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';

const collection = { name: 'posts', label: 'Posts' } as unknown as CmsCollectionState;
const entry = { slug: 'hello', collection: 'posts', data: {} } as unknown as CmsEntry;

const t = ((key: string) => key) as never;

function makePanel(overrides: Partial<EditorPanel> = {}): EditorPanel {
  return {
    id: 'seo',
    label: 'SEO',
    render: () => <div>seo panel body</div>,
    ...overrides,
  };
}

function renderPanels(slots?: { editorPanels?: EditorPanel[] }) {
  return render(
    <CmsSlotsProvider slots={slots}>
      <EditorPanels panelProps={{ collection, entry }} t={t} />
    </CmsSlotsProvider>,
  );
}

describe('EditorPanels', () => {
  afterEach(() => {
    getPanels().forEach(panel => unregisterPanel(panel.id));
  });

  it('renders nothing at all when no panels are installed', () => {
    const { container } = renderPanels();

    // The guarantee that makes this safe to add: a deployment with no panels
    // gets byte-identical editor markup, not an empty wrapper or a dead toggle.
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a toggle but no panel body until opened', () => {
    renderPanels({ editorPanels: [makePanel()] });

    expect(screen.getByRole('button', { name: 'editor.editorInterface.openPanels' }))
      .toBeInTheDocument();
    expect(screen.queryByText('seo panel body')).not.toBeInTheDocument();
  });

  it('opens and closes the drawer', async () => {
    const user = userEvent.setup();
    renderPanels({ editorPanels: [makePanel()] });

    await user.click(screen.getByRole('button', { name: 'editor.editorInterface.openPanels' }));
    expect(screen.getByText('seo panel body')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'editor.editorInterface.closePanels' }));
    expect(screen.queryByText('seo panel body')).not.toBeInTheDocument();
  });

  it('passes the collection, entry and an onClose to the panel', async () => {
    const user = userEvent.setup();
    const renderPanel = vi.fn(({ onClose }: { onClose: () => void }) => (
      <button type="button" onClick={onClose}>close me</button>
    ));
    renderPanels({ editorPanels: [makePanel({ render: renderPanel })] });

    await user.click(screen.getByRole('button', { name: 'editor.editorInterface.openPanels' }));

    expect(renderPanel).toHaveBeenCalledWith(
      expect.objectContaining({ collection, entry, onClose: expect.any(Function) }),
    );

    await user.click(screen.getByRole('button', { name: 'close me' }));
    expect(screen.queryByRole('button', { name: 'close me' })).not.toBeInTheDocument();
  });

  it('shows tabs and switches between several panels', async () => {
    const user = userEvent.setup();
    renderPanels({
      editorPanels: [
        makePanel(),
        makePanel({ id: 'notes', label: 'Notes', render: () => <div>notes panel body</div> }),
      ],
    });

    await user.click(screen.getByRole('button', { name: 'editor.editorInterface.openPanels' }));
    expect(screen.getByText('seo panel body')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Notes' }));
    expect(screen.getByText('notes panel body')).toBeInTheDocument();
    expect(screen.queryByText('seo panel body')).not.toBeInTheDocument();
  });

  it('omits a panel whose isAvailable returns false', () => {
    renderPanels({ editorPanels: [makePanel({ isAvailable: () => false })] });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders panels installed through the registry', async () => {
    const user = userEvent.setup();
    registerPanel(makePanel({ id: 'registered', render: () => <div>registered body</div> }));

    renderPanels();

    await user.click(screen.getByRole('button', { name: 'editor.editorInterface.openPanels' }));
    expect(screen.getByText('registered body')).toBeInTheDocument();
  });

  it('concatenates app-supplied and registered panels, app first', async () => {
    const user = userEvent.setup();
    registerPanel(makePanel({ id: 'registered', label: 'Registered' }));

    renderPanels({ editorPanels: [makePanel({ id: 'app', label: 'App' })] });

    await user.click(screen.getByRole('button', { name: 'editor.editorInterface.openPanels' }));

    // Additive, unlike the replace-style slots: two installers both get a tab.
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['App', 'Registered']);
  });
});

describe('registerPanel', () => {
  afterEach(() => {
    getPanels().forEach(panel => unregisterPanel(panel.id));
  });

  it('rejects a panel without an id or render', () => {
    expect(() => registerPanel({ label: 'x', render: () => null } as never)).toThrow(
      /Panel parameters invalid/,
    );
    expect(() => registerPanel({ id: 'x', label: 'x' } as never)).toThrow(
      /Panel parameters invalid/,
    );
  });

  it('rejects a duplicate id', () => {
    registerPanel(makePanel());

    expect(() => registerPanel(makePanel())).toThrow(/panel with id seo has already/);
  });

  it('keeps registration order and unregisters by id', () => {
    registerPanel(makePanel({ id: 'a' }));
    registerPanel(makePanel({ id: 'b' }));

    expect(getPanels().map(panel => panel.id)).toEqual(['a', 'b']);

    unregisterPanel('a');
    expect(getPanels().map(panel => panel.id)).toEqual(['b']);
  });

  it('returns a copy, so mutating it does not touch the registry', () => {
    registerPanel(makePanel());

    getPanels().pop();

    expect(getPanels()).toHaveLength(1);
  });
});
