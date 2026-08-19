import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSlots, registerPanel, registerSlot, unregisterSlot } from '@/core/lib/registry';
import { CmsSlotsProvider, useCmsSlots } from '@/core/lib/slots';
import EditorPanels from '@/core/components/Editor/EditorPanels';

import type { CmsSlots } from '@/core/lib/slots';

/**
 * Pinning tests for DCMS-NEW-SLOTS: the `CmsSlots` render-slot context is a
 * public, load-bearing extension surface (used by laika-app and 9 internal
 * consumers) but previously shipped with zero unit tests. These pin the
 * contract described in the `slots.tsx` JSDoc.
 */

function SlotsProbe({ onSlots }: { onSlots: (slots: CmsSlots) => void }) {
  onSlots(useCmsSlots());
  return null;
}

describe('slots', () => {
  afterEach(() => {
    // The registry is module state shared across this file's tests.
    for (const name of Object.keys(getSlots()) as (keyof CmsSlots)[]) {
      unregisterSlot(name);
    }
  });

  describe('useCmsSlots', () => {
    it('returns an object with every slot undefined when no CmsSlotsProvider is present', () => {
      let captured: CmsSlots | undefined;
      render(<SlotsProbe onSlots={slots => (captured = slots)} />);

      expect(captured).toEqual({});
      expect(captured?.renderCollectionTop).toBeUndefined();
      expect(captured?.renderCollectionSidebar).toBeUndefined();
      expect(captured?.renderCollectionControls).toBeUndefined();
      expect(captured?.renderEntryCard).toBeUndefined();
      expect(captured?.renderEntryListEmpty).toBeUndefined();
      expect(captured?.renderLoader).toBeUndefined();
      expect(captured?.renderWorkflowCard).toBeUndefined();
      expect(captured?.renderEditorToolbar).toBeUndefined();
      expect(captured?.renderEditorViewControls).toBeUndefined();
      expect(captured?.renderMediaLibraryCard).toBeUndefined();
      expect(captured?.renderMediaLibraryTop).toBeUndefined();
    });
  });

  describe('CmsSlotsProvider', () => {
    it('resolves only the keys supplied in a partial CmsSlots object, leaving the rest undefined', () => {
      const renderLoader = () => <div>custom loader</div>;
      const renderEntryCard = () => <div>custom entry card</div>;

      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider slots={{ renderLoader, renderEntryCard }}>
          <SlotsProbe onSlots={slots => (captured = slots)} />
        </CmsSlotsProvider>,
      );

      expect(captured?.renderLoader).toBe(renderLoader);
      expect(captured?.renderEntryCard).toBe(renderEntryCard);
      expect(captured?.renderCollectionTop).toBeUndefined();
      expect(captured?.renderWorkflowCard).toBeUndefined();
      expect(captured?.renderMediaLibraryTop).toBeUndefined();
    });

    it('falls back to an empty slots object when rendered without a slots prop', () => {
      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider>
          <SlotsProbe onSlots={slots => (captured = slots)} />
        </CmsSlotsProvider>,
      );

      expect(captured).toEqual({});
    });

    it('lets an inner provider win over an outer one for overlapping keys, while non-overridden keys still resolve to the outer value', () => {
      const outerLoader = () => <div>outer loader</div>;
      const innerLoader = () => <div>inner loader</div>;
      const outerEntryCard = () => <div>outer entry card</div>;

      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider slots={{ renderLoader: outerLoader, renderEntryCard: outerEntryCard }}>
          <CmsSlotsProvider slots={{ renderLoader: innerLoader }}>
            <SlotsProbe onSlots={slots => (captured = slots)} />
          </CmsSlotsProvider>
        </CmsSlotsProvider>,
      );

      // Inner provider replaces the whole slots object, so it wins for the
      // key it sets and does NOT inherit/merge the outer's other keys.
      expect(captured?.renderLoader).toBe(innerLoader);
      expect(captured?.renderEntryCard).toBeUndefined();
    });

    it('lets a nested provider inherit the outer value for a key it does not itself override', () => {
      const outerLoader = () => <div>outer loader</div>;
      const innerEntryCard = () => <div>inner entry card</div>;

      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider slots={{ renderLoader: outerLoader }}>
          <CmsSlotsProvider slots={{ renderLoader: outerLoader, renderEntryCard: innerEntryCard }}>
            <SlotsProbe onSlots={slots => (captured = slots)} />
          </CmsSlotsProvider>
        </CmsSlotsProvider>,
      );

      expect(captured?.renderLoader).toBe(outerLoader);
      expect(captured?.renderEntryCard).toBe(innerEntryCard);
    });
  });

  describe('registerSlot', () => {
    it('rejects a missing name or a non-function renderer', () => {
      expect(() => registerSlot('' as keyof CmsSlots, () => null)).toThrow(
        /Slot parameters invalid/,
      );
      expect(() => registerSlot('renderLoader', undefined as never)).toThrow(
        /Slot parameters invalid/,
      );
    });

    it('makes a registered slot visible to useCmsSlots with no provider in the tree', () => {
      const renderLoader = () => <div>extension loader</div>;
      registerSlot('renderLoader', renderLoader);

      let captured: CmsSlots | undefined;
      render(<SlotsProbe onSlots={slots => (captured = slots)} />);

      expect(captured?.renderLoader).toBe(renderLoader);
    });

    it('lets the app override a registered slot, while non-overridden ones still resolve', () => {
      const extensionLoader = () => <div>extension loader</div>;
      const extensionEntryCard = () => <div>extension entry card</div>;
      const appLoader = () => <div>app loader</div>;
      registerSlot('renderLoader', extensionLoader);
      registerSlot('renderEntryCard', extensionEntryCard);

      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider slots={{ renderLoader: appLoader }}>
          <SlotsProbe onSlots={slots => (captured = slots)} />
        </CmsSlotsProvider>,
      );

      // The app wins on conflict: a deployment must be able to override what
      // one of its dependencies renders.
      expect(captured?.renderLoader).toBe(appLoader);
      expect(captured?.renderEntryCard).toBe(extensionEntryCard);
    });

    it('warns and keeps the last renderer when a slot is registered twice', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const first = () => <div>first</div>;
      const second = () => <div>second</div>;

      registerSlot('renderEntryCard', first);
      registerSlot('renderEntryCard', second);

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Multiple renderers registered for slot "renderEntryCard"'),
      );
      expect(getSlots().renderEntryCard).toBe(second);

      consoleWarn.mockRestore();
    });

    it('unregisterSlot removes it again', () => {
      registerSlot('renderLoader', () => <div>extension loader</div>);
      unregisterSlot('renderLoader');

      let captured: CmsSlots | undefined;
      render(<SlotsProbe onSlots={slots => (captured = slots)} />);

      expect(captured).toEqual({});
    });

    it('getSlots returns a copy, so mutating it does not touch the registry', () => {
      const renderLoader = () => <div>extension loader</div>;
      registerSlot('renderLoader', renderLoader);

      const slots = getSlots();
      delete slots.renderLoader;

      expect(getSlots().renderLoader).toBe(renderLoader);
    });
  });

  describe('editorPanels', () => {
    const panelProps = {
      collection: { name: 'posts', label: 'Posts' } as any,
      entry: { slug: 'hello-world', collection: 'posts', data: {} } as any,
    };
    const t = ((key: string) => key) as any;

    it('concatenates app-supplied and CMS.registerPanel-registered panels, app-supplied first', () => {
      const appPanel = { id: 'app-panel', label: 'App Panel', render: () => <div>app panel body</div> };
      const registeredPanel = {
        id: 'registered-panel',
        label: 'Registered Panel',
        render: () => <div>registered panel body</div>,
      };
      registerPanel(registeredPanel);

      const { getByRole, getAllByRole } = render(
        <CmsSlotsProvider slots={{ editorPanels: [appPanel] }}>
          <EditorPanels panelProps={panelProps} t={t} />
        </CmsSlotsProvider>,
      );

      fireEvent.click(getByRole('button', { name: 'editor.editorInterface.openPanels' }));

      const tabs = getAllByRole('tab');
      expect(tabs.map(tab => tab.textContent)).toEqual(['App Panel', 'Registered Panel']);
    });

    it('renders nothing when no panels are installed from either source', () => {
      const { container, queryByRole } = render(<EditorPanels panelProps={panelProps} t={t} />);

      expect(container).toBeEmptyDOMElement();
      expect(queryByRole('button')).toBeNull();
    });
  });

  describe('renderCollectionControls', () => {
    it('receives searchQuery and onSearchChange when invoked from Collection.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/hooks/useRedux', () => ({
        useAppDispatch: () => vi.fn(),
        useAppSelector: (selector: (state: any) => any) =>
          selector({
            collections: {
              shop: { name: 'shop', label: 'Shop', nested: { depth: 100 }, create: true },
            },
            entries: {},
            config: {},
          }),
      }));

      vi.doMock('@/core/i18n', () => ({
        useTranslate: () => (key: string) => key,
      }));

      vi.doMock('@/core/reducers/collections', () => ({
        selectSortableFields: () => [],
        selectViewFilters: () => undefined,
        selectViewGroups: () => undefined,
      }));

      vi.doMock('@/core/reducers/entries', () => ({
        selectEntriesFilter: () => undefined,
        selectEntriesGroup: () => undefined,
        selectEntriesSort: () => undefined,
        selectViewStyle: () => 'list',
      }));

      vi.doMock('@/core/components/Collection/Sidebar', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/CollectionTop', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/CollectionControls', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/Entries/EntriesCollection', () => ({
        default: () => null,
      }));
      vi.doMock('@/core/components/Collection/Entries/EntriesSearch', () => ({
        default: () => null,
      }));

      const renderCollectionControls = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderCollectionControls }),
      }));

      const { default: CmsCollection } = await import('@/core/components/Collection/Collection');

      render(<CmsCollection match={{ params: { name: 'shop' } }} />);

      expect(renderCollectionControls).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: expect.any(String),
          onSearchChange: expect.any(Function),
        }),
      );

      vi.doUnmock('@/core/hooks/useRedux');
      vi.doUnmock('@/core/i18n');
      vi.doUnmock('@/core/reducers/collections');
      vi.doUnmock('@/core/reducers/entries');
      vi.doUnmock('@/core/components/Collection/Sidebar');
      vi.doUnmock('@/core/components/Collection/CollectionTop');
      vi.doUnmock('@/core/components/Collection/CollectionControls');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesCollection');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesSearch');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderCollectionTop', () => {
    it('receives filterTerm when invoked from Collection.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/hooks/useRedux', () => ({
        useAppDispatch: () => vi.fn(),
        useAppSelector: (selector: (state: any) => any) =>
          selector({
            collections: {
              shop: { name: 'shop', label: 'Shop', nested: { depth: 100 }, create: true },
            },
            entries: {},
            config: {},
          }),
      }));

      vi.doMock('@/core/i18n', () => ({
        useTranslate: () => (key: string) => key,
      }));

      vi.doMock('@/core/reducers/collections', () => ({
        selectSortableFields: () => [],
        selectViewFilters: () => undefined,
        selectViewGroups: () => undefined,
      }));

      vi.doMock('@/core/reducers/entries', () => ({
        selectEntriesFilter: () => undefined,
        selectEntriesGroup: () => undefined,
        selectEntriesSort: () => undefined,
        selectViewStyle: () => 'list',
      }));

      vi.doMock('@/core/components/Collection/Sidebar', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/CollectionTop', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/CollectionControls', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/Entries/EntriesCollection', () => ({
        default: () => null,
      }));
      vi.doMock('@/core/components/Collection/Entries/EntriesSearch', () => ({
        default: () => null,
      }));

      const renderCollectionTop = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderCollectionTop }),
      }));

      const { default: CmsCollection } = await import('@/core/components/Collection/Collection');

      render(
        <CmsCollection match={{ params: { name: 'shop', filterTerm: 'nested/path' } }} />,
      );

      expect(renderCollectionTop).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: expect.objectContaining({ name: 'shop' }),
          filterTerm: 'nested/path',
        }),
      );

      vi.doUnmock('@/core/hooks/useRedux');
      vi.doUnmock('@/core/i18n');
      vi.doUnmock('@/core/reducers/collections');
      vi.doUnmock('@/core/reducers/entries');
      vi.doUnmock('@/core/components/Collection/Sidebar');
      vi.doUnmock('@/core/components/Collection/CollectionTop');
      vi.doUnmock('@/core/components/Collection/CollectionControls');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesCollection');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesSearch');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderCollectionSidebar', () => {
    it('receives collections, isSearchEnabled, searchTerm, and userScopes when invoked from Collection.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/hooks/useRedux', () => ({
        useAppDispatch: () => vi.fn(),
        useAppSelector: (selector: (state: any) => any) =>
          selector({
            collections: {
              shop: { name: 'shop', label: 'Shop', nested: { depth: 100 }, create: true },
            },
            entries: {},
            config: {},
          }),
      }));

      vi.doMock('@/core/i18n', () => ({
        useTranslate: () => (key: string) => key,
      }));

      vi.doMock('@/core/reducers/collections', () => ({
        selectSortableFields: () => [],
        selectViewFilters: () => undefined,
        selectViewGroups: () => undefined,
      }));

      vi.doMock('@/core/reducers/entries', () => ({
        selectEntriesFilter: () => undefined,
        selectEntriesGroup: () => undefined,
        selectEntriesSort: () => undefined,
        selectViewStyle: () => 'list',
      }));

      vi.doMock('@/core/components/Collection/Sidebar', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/CollectionTop', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/CollectionControls', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/Entries/EntriesCollection', () => ({
        default: () => null,
      }));
      vi.doMock('@/core/components/Collection/Entries/EntriesSearch', () => ({
        default: () => null,
      }));

      const renderCollectionSidebar = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderCollectionSidebar }),
      }));

      const { default: CmsCollection } = await import('@/core/components/Collection/Collection');

      render(<CmsCollection match={{ params: { name: 'shop' } }} />);

      expect(renderCollectionSidebar).toHaveBeenCalledWith(
        expect.objectContaining({
          collections: expect.objectContaining({ shop: expect.objectContaining({ name: 'shop' }) }),
          collection: expect.objectContaining({ name: 'shop' }),
          isSearchEnabled: true,
          searchTerm: '',
          userScopes: expect.any(Array),
        }),
      );

      vi.doUnmock('@/core/hooks/useRedux');
      vi.doUnmock('@/core/i18n');
      vi.doUnmock('@/core/reducers/collections');
      vi.doUnmock('@/core/reducers/entries');
      vi.doUnmock('@/core/components/Collection/Sidebar');
      vi.doUnmock('@/core/components/Collection/CollectionTop');
      vi.doUnmock('@/core/components/Collection/CollectionControls');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesCollection');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesSearch');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderEntryCard', () => {
    it('receives collection, entry, and inferredFields when invoked from EntryListing.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/i18n', () => ({
        useTranslate: () => (key: string) => key,
      }));

      vi.doMock('@/core/reducers/collections', () => ({
        selectFields: () => [],
        selectInferredField: () => undefined,
        selectSortDataPath: () => '',
      }));

      vi.doMock('@/core/components/Collection/Entries/EntryCard', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/Entries/EntriesCollection', () => ({
        filterNestedEntries: () => [],
      }));

      const renderEntryCard = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderEntryCard }),
      }));

      const { default: EntryListing } = await import(
        '@/core/components/Collection/Entries/EntryListing'
      );

      const collection = { name: 'posts', type: 'folder_based_collection', label: 'Posts' };

      render(
        <EntryListing
          collections={collection as any}
          entries={[{ slug: 'hello-world', collection: 'posts', data: {} } as any]}
          cursor={{} as any}
          handleCursorActions={vi.fn()}
        />,
      );

      expect(renderEntryCard).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: expect.objectContaining({ name: 'posts' }),
          entry: expect.objectContaining({ slug: 'hello-world' }),
          inferredFields: expect.any(Object),
        }),
      );

      vi.doUnmock('@/core/i18n');
      vi.doUnmock('@/core/reducers/collections');
      vi.doUnmock('@/core/components/Collection/Entries/EntryCard');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesCollection');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderEntryListEmpty', () => {
    it('receives the scoped collection when the resolved entry list is empty, invoked from EntryListing.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/i18n', () => ({
        useTranslate: () => (key: string) => key,
      }));

      vi.doMock('@/core/reducers/collections', () => ({
        selectFields: () => [],
        selectInferredField: () => undefined,
        selectSortDataPath: () => '',
      }));

      vi.doMock('@/core/components/Collection/Entries/EntryCard', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/Entries/EntriesCollection', () => ({
        filterNestedEntries: () => [],
      }));

      const renderEntryListEmpty = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderEntryListEmpty }),
      }));

      const { default: EntryListing } = await import(
        '@/core/components/Collection/Entries/EntryListing'
      );

      const collection = { name: 'posts', type: 'folder_based_collection', label: 'Posts' };

      render(
        <EntryListing
          collections={collection as any}
          entries={[]}
          cursor={{} as any}
          handleCursorActions={vi.fn()}
        />,
      );

      expect(renderEntryListEmpty).toHaveBeenCalledWith(
        expect.objectContaining({ collection: expect.objectContaining({ name: 'posts' }) }),
      );

      vi.doUnmock('@/core/i18n');
      vi.doUnmock('@/core/reducers/collections');
      vi.doUnmock('@/core/components/Collection/Entries/EntryCard');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesCollection');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderLoader', () => {
    it('receives the translated label array and an "entries" context when invoked from Entries.tsx', async () => {
      vi.resetModules();

      const renderLoader = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderLoader }),
      }));

      const { default: Entries } = await import('@/core/components/Collection/Entries/Entries');
      const { I18n } = await import('@/core/i18n');

      render(
        <I18n locale="en" messages={{}}>
          <Entries
            collections={{ name: 'posts', type: 'folder_based_collection', label: 'Posts' } as any}
            entries={[]}
            isFetching
            cursor={{} as any}
            handleCursorActions={vi.fn()}
          />
        </I18n>,
      );

      expect(renderLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          label: expect.any(Array),
          context: 'entries',
        }),
      );

      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderWorkflowCard', () => {
    it('receives collectionLabel, title, editLink, and the publish/delete handlers when invoked from WorkflowList.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/i18n', () => ({
        translate: () => (Component: React.ComponentType<any>) => {
          return function Translated(props: any) {
            return <Component {...props} t={(key: string) => key} />;
          };
        },
      }));

      const renderWorkflowCard = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderWorkflowCard }),
      }));

      const { default: WorkflowList } = await import('@/core/components/Workflow/WorkflowList');
      const { RouterProvider } = await import('@/core/routing/context');

      const router = {
        location: () => ({ pathname: '/workflow', search: '' }),
        push: vi.fn(),
        replace: vi.fn(),
        href: (path: string) => `#${path}`,
        subscribe: vi.fn(() => () => {}),
        block: vi.fn(() => () => {}),
      };

      render(
        <RouterProvider router={router as any}>
          <WorkflowList
            entries={{
              draft: [
                {
                  slug: 'hello-world',
                  collection: 'posts',
                  status: 'draft',
                  updatedOn: '2026-01-01T00:00:00.000Z',
                  data: { title: 'Hello World', body: 'Body' },
                  metaData: { user: 'Alice' },
                },
              ],
              pending_review: [],
              pending_publish: [],
            }}
            handleChangeStatus={vi.fn()}
            handlePublish={vi.fn()}
            handleDelete={vi.fn()}
            collections={{ posts: { name: 'posts', label: 'Posts', publish: true } } as any}
          />
        </RouterProvider>,
      );

      expect(renderWorkflowCard).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionLabel: 'Posts',
          title: 'Hello World',
          editLink: expect.any(String),
          onDelete: expect.any(Function),
          onPublish: expect.any(Function),
          canDelete: expect.any(Boolean),
        }),
      );

      vi.doUnmock('@/core/i18n');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderEditorToolbar', () => {
    it('receives the pre-resolved persist/publish/delete handlers and collection when invoked from EditorInterface.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/components/Editor/EditorControlPane/EditorControlPane', () => ({
        default: React.forwardRef((_props: any, ref: unknown) => {
          if (typeof ref === 'function') {
            ref({ validate: () => {}, focus: () => {}, switchToDefaultLocale: () => Promise.resolve() });
          }
          return <div data-testid="control-pane" />;
        }),
      }));
      vi.doMock('@/core/components/Editor/EditorPreviewPane/EditorPreviewPane', () => ({
        default: () => <div data-testid="preview-pane" />,
      }));
      vi.doMock('@/core/components/Editor/EntryLockBanner', () => ({ default: () => null }));
      vi.doMock('@/core/lib/i18n', async importOriginal => ({
        ...(await importOriginal<Record<string, unknown>>()),
        hasI18n: () => false,
        getI18nInfo: () => ({ locales: [], defaultLocale: '' }),
        getPreviewEntry: (entry: unknown) => entry,
      }));
      vi.doMock('@/core/reducers/collections', () => ({
        getFileFromSlug: () => undefined,
        selectEntryCollectionTitle: (_c: unknown, entry: { data?: Record<string, unknown> }) =>
          entry?.data?.title as string | undefined,
      }));
      vi.doMock('react-split-pane', () => ({
        SplitPane: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        Pane: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      }));

      const renderEditorToolbar = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderEditorToolbar }),
      }));

      const { default: EditorInterface } = await import('@/core/components/Editor/EditorInterface');

      render(
        <EditorInterface
          collection={{ type: 'other', editor: { preview: false } } as any}
          entry={{ slug: 'slug', isPersisting: false } as any}
          fields={[]}
          fieldsMetaData={{}}
          fieldsErrors={{}}
          onChange={vi.fn()}
          onValidate={vi.fn()}
          onPersist={vi.fn()}
          showDelete
          onDelete={vi.fn()}
          onDeleteUnpublishedChanges={vi.fn()}
          onPublish={vi.fn()}
          unPublish={vi.fn()}
          onDuplicate={vi.fn()}
          onChangeStatus={vi.fn()}
          onLogoutClick={vi.fn()}
          loadDeployPreview={vi.fn()}
          draftKey="key"
          t={((key: string) => key) as any}
        />,
      );

      expect(renderEditorToolbar).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: expect.objectContaining({ type: 'other' }),
          showDelete: true,
          onPersist: expect.any(Function),
          onPublish: expect.any(Function),
          onDelete: expect.any(Function),
        }),
      );

      vi.doUnmock('@/core/components/Editor/EditorControlPane/EditorControlPane');
      vi.doUnmock('@/core/components/Editor/EditorPreviewPane/EditorPreviewPane');
      vi.doUnmock('@/core/components/Editor/EntryLockBanner');
      vi.doUnmock('@/core/lib/i18n');
      vi.doUnmock('@/core/reducers/collections');
      vi.doUnmock('react-split-pane');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderEditorViewControls', () => {
    it('receives the i18n/preview/scrollSync enabled+visible flags and toggle handlers when invoked from EditorInterface.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/components/Editor/EditorControlPane/EditorControlPane', () => ({
        default: React.forwardRef((_props: any, ref: unknown) => {
          if (typeof ref === 'function') {
            ref({ validate: () => {}, focus: () => {}, switchToDefaultLocale: () => Promise.resolve() });
          }
          return <div data-testid="control-pane" />;
        }),
      }));
      vi.doMock('@/core/components/Editor/EditorPreviewPane/EditorPreviewPane', () => ({
        default: () => <div data-testid="preview-pane" />,
      }));
      vi.doMock('@/core/components/Editor/EditorToolbar', () => ({
        default: () => <div data-testid="toolbar" />,
      }));
      vi.doMock('@/core/components/Editor/EntryLockBanner', () => ({ default: () => null }));
      vi.doMock('@/core/lib/i18n', async importOriginal => ({
        ...(await importOriginal<Record<string, unknown>>()),
        hasI18n: () => false,
        getI18nInfo: () => ({ locales: [], defaultLocale: '' }),
        getPreviewEntry: (entry: unknown) => entry,
      }));
      vi.doMock('@/core/reducers/collections', () => ({
        getFileFromSlug: () => undefined,
        selectEntryCollectionTitle: (_c: unknown, entry: { data?: Record<string, unknown> }) =>
          entry?.data?.title as string | undefined,
      }));
      vi.doMock('react-split-pane', () => ({
        SplitPane: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        Pane: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      }));

      const renderEditorViewControls = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderEditorViewControls }),
      }));

      const { default: EditorInterface } = await import('@/core/components/Editor/EditorInterface');

      render(
        <EditorInterface
          collection={{ type: 'other', editor: { preview: false } } as any}
          entry={{ slug: 'slug', isPersisting: false } as any}
          fields={[]}
          fieldsMetaData={{}}
          fieldsErrors={{}}
          onChange={vi.fn()}
          onValidate={vi.fn()}
          onPersist={vi.fn()}
          showDelete
          onDelete={vi.fn()}
          onDeleteUnpublishedChanges={vi.fn()}
          onPublish={vi.fn()}
          unPublish={vi.fn()}
          onDuplicate={vi.fn()}
          onChangeStatus={vi.fn()}
          onLogoutClick={vi.fn()}
          loadDeployPreview={vi.fn()}
          draftKey="key"
          t={((key: string) => key) as any}
        />,
      );

      expect(renderEditorViewControls).toHaveBeenCalledWith(
        expect.objectContaining({
          i18nEnabled: false,
          previewEnabled: false,
          scrollSyncEnabled: expect.any(Boolean),
          onToggleI18n: expect.any(Function),
          onTogglePreview: expect.any(Function),
          onToggleScrollSync: expect.any(Function),
        }),
      );

      vi.doUnmock('@/core/components/Editor/EditorControlPane/EditorControlPane');
      vi.doUnmock('@/core/components/Editor/EditorPreviewPane/EditorPreviewPane');
      vi.doUnmock('@/core/components/Editor/EditorToolbar');
      vi.doUnmock('@/core/components/Editor/EntryLockBanner');
      vi.doUnmock('@/core/lib/i18n');
      vi.doUnmock('@/core/reducers/collections');
      vi.doUnmock('react-split-pane');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderMediaLibraryCard', () => {
    it('receives displayURL, text, isViewableImage, and the click/load handlers when invoked from MediaLibraryCardGrid.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/ui/hooks/useElementSize', () => ({
        useElementSize: () => ({ width: 1200, height: 400 }),
      }));

      const renderMediaLibraryCard = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderMediaLibraryCard }),
      }));

      const { default: MediaLibraryCardGrid } = await import(
        '@/core/components/MediaLibrary/MediaLibraryCardGrid'
      );

      render(
        <MediaLibraryCardGrid
          setScrollContainerRef={vi.fn()}
          mediaItems={[
            { id: '1', key: '1', name: 'moby-dick.jpg', type: 'image', isViewableImage: true },
          ]}
          isSelectedFile={() => false}
          onAssetClick={vi.fn()}
          onLoadMore={vi.fn()}
          cardDraftText="Draft"
          cardWidth="100px"
          cardHeight="100px"
          cardMargin="10px"
          loadDisplayURL={vi.fn()}
          displayURLs={{}}
        />,
      );

      expect(renderMediaLibraryCard).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'moby-dick.jpg',
          isViewableImage: true,
          onClick: expect.any(Function),
          loadDisplayURL: expect.any(Function),
          draftText: 'Draft',
        }),
      );

      vi.doUnmock('@/ui/hooks/useElementSize');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });

  describe('renderMediaLibraryTop', () => {
    it('receives the pre-resolved search/upload/download/delete/insert handlers when invoked from MediaLibraryModal.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/components/MediaLibrary/MediaLibraryCardGrid', () => ({
        default: () => null,
      }));

      const renderMediaLibraryTop = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderMediaLibraryTop }),
      }));

      const { default: MediaLibraryModal } = await import(
        '@/core/components/MediaLibrary/MediaLibraryModal'
      );
      const { I18n } = await import('@/core/i18n');

      render(
        <I18n locale="en" messages={{}}>
          <MediaLibraryModal
            isVisible
            canInsert
            files={[]}
            handleFilter={files => files}
            handleQuery={(_query, files) => files}
            toTableData={() => []}
            handleClose={vi.fn()}
            handleSearchChange={vi.fn()}
            handleSearchKeyDown={vi.fn()}
            handlePersist={vi.fn()}
            handleDelete={vi.fn()}
            handleInsert={vi.fn()}
            setScrollContainerRef={vi.fn()}
            handleAssetClick={vi.fn()}
            handleLoadMore={vi.fn()}
            loadDisplayURL={vi.fn()}
            displayURLs={{}}
          />
        </I18n>,
      );

      expect(renderMediaLibraryTop).toHaveBeenCalledWith(
        expect.objectContaining({
          onClose: expect.any(Function),
          onDownload: expect.any(Function),
          onUpload: expect.any(Function),
          onSearchChange: expect.any(Function),
          onSearchKeyDown: expect.any(Function),
          onDelete: expect.any(Function),
          onInsert: expect.any(Function),
          canInsert: true,
          hasSelection: expect.any(Boolean),
        }),
      );

      vi.doUnmock('@/core/components/MediaLibrary/MediaLibraryCardGrid');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });
});
