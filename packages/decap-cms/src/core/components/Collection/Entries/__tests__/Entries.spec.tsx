import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import Entries from '@/core/components/Collection/Entries/Entries';
import { I18n } from '@/core/i18n';
import { CmsSlotsProvider } from '@/core/lib/slots';
import { Cursor } from '@/lib/util/index';

import type { CmsCollectionState } from '@/lib/util/index';

const messages = {
  collection: {
    entries: {
      loadingEntries: 'Loading entries...',
      cachingEntries: 'Caching entries...',
      longerLoading: 'This is taking longer than expected...',
      noEntries: 'No entries',
    },
  },
};

const collection = {
  name: 'posts',
  label: 'Posts',
  type: 'folder_based_collection',
} as unknown as CmsCollectionState;

function renderEntries(renderEntryListEmpty: () => React.ReactNode, isFetching: boolean) {
  return render(
    <I18n locale="en" messages={messages}>
      <CmsSlotsProvider slots={{ renderEntryListEmpty }}>
        <Entries
          collections={collection}
          entries={[]}
          isFetching={isFetching}
          cursor={new Cursor()}
          handleCursorActions={() => {}}
          getUnpublishedEntries={() => []}
          showPublishedEntries={false}
        />
      </CmsSlotsProvider>
    </I18n>,
  );
}

// DCMS-2258: `docs/core/slots.md` documents `renderEntryListEmpty` as firing
// "only once the cards array is fully resolved and empty — never during
// loading." The `showPublishedEntries={false}` branch (grouped/unpublished
// entry lists, see EntriesCollection.tsx) previously skipped the
// `isFetching` loading guard entirely, letting the empty-state slot fire
// transiently while the async unpublished-entries load was still pending.
describe('Entries (DCMS-2258)', () => {
  it('does not call renderEntryListEmpty while isFetching is true, even with showPublishedEntries=false', () => {
    const renderEntryListEmpty = vi.fn(() => <div>empty state</div>);

    renderEntries(renderEntryListEmpty, true);

    expect(renderEntryListEmpty).not.toHaveBeenCalled();
  });

  it('calls renderEntryListEmpty once loading has finished and the list is still empty', () => {
    const renderEntryListEmpty = vi.fn(() => <div>empty state</div>);

    renderEntries(renderEntryListEmpty, false);

    expect(renderEntryListEmpty).toHaveBeenCalled();
  });
});
