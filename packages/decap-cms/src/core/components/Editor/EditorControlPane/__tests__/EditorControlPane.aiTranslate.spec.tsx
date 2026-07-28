// Forces `@/core/lib/validateConfig` (which reads `I18N_STRUCTURE` at module
// eval time) to finish loading before anything reaches it via the
// i18n.tsx -> reducers/collections -> ... -> validateConfig import cycle;
// otherwise whichever module is loaded first by the test runner "wins" the
// race and validateConfig can observe an unfinished `i18n.tsx` module
// (`Object.values(undefined)`). The app's real bootstrap order always
// imports config validation before the editor, so this mirrors that.
import '@/core/lib/validateConfig';

const mockTranslate = vi.fn().mockResolvedValue(undefined);

vi.mock('@/ui', () => ({
  confirmDialog: vi.fn().mockResolvedValue(true),
}));

// The per-field widget tree pulls in the real Redux store (`@/core/redux`)
// via a long import chain, which isn't needed to exercise the locale-pane
// "Translate from <default locale>" action tested here; stub it out to keep
// this test focused and avoid an unrelated circular-import initialization
// order issue in that chain.
vi.mock('../EditorControl', () => ({
  default: () => null,
}));

vi.mock('../useAiTranslate', () => ({
  useAiTranslate: vi.fn(() => ({
    translate: mockTranslate,
    isTranslating: false,
    error: null,
  })),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ControlPane from '@/core/components/Editor/EditorControlPane/EditorControlPane';

import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@/lib/util/index';

const fields = [
  { name: 'title', widget: 'string', i18n: 'translate' },
  { name: 'internalNote', widget: 'string', i18n: 'none' },
] as unknown as CmsEntryField[];

const collection = {
  name: 'posts',
  type: 'folder_based_collection',
  fields,
  i18n: {
    structure: 'multiple_folders',
    locales: ['en', 'fr'],
    default_locale: 'en',
  },
} as unknown as CmsCollectionState;

const entry = {
  slug: 'my-post',
  collection: 'posts',
  data: { title: 'Hello world', internalNote: 'secret' },
  i18n: {},
  meta: {},
} as unknown as CmsEntry;

function renderPane(overrides: Partial<React.ComponentProps<typeof ControlPane>> = {}) {
  return render(
    <ControlPane
      collection={collection}
      entry={entry}
      fields={fields}
      fieldsMetaData={{}}
      fieldsErrors={{}}
      onChange={vi.fn()}
      onValidate={vi.fn()}
      locale="fr"
      t={(key: string, options?: Record<string, string>) => {
        if (key === 'editor.editorControlPane.i18n.translateFromDefault') {
          return `Translate from ${options?.locale}`;
        }
        return key;
      }}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTranslate.mockResolvedValue(undefined);
});

describe('EditorControlPane AI translate action', () => {
  it('renders a "Translate from <default locale>" button for a non-default locale', () => {
    renderPane();
    expect(screen.getByText('Translate from EN')).toBeInTheDocument();
  });

  it('does not render the translate button when viewing the default locale', () => {
    renderPane({ locale: 'en' });
    expect(screen.queryByText(/Translate from/)).not.toBeInTheDocument();
  });

  it('calls translate with only translatable fields read from the default locale', async () => {
    const user = userEvent.setup();
    renderPane();

    await user.click(screen.getByText('Translate from EN'));

    expect(mockTranslate).toHaveBeenCalledTimes(1);
    const call = mockTranslate.mock.calls[0][0];
    expect(call.sourceLocale).toBe('en');
    expect(call.targetLocale).toBe('fr');
    expect(call.slug).toBe('my-post');
    expect(call.collection).toBe('posts');
    expect(call.fields).toEqual([{ name: 'title', value: 'Hello world' }]);
  });

  it('applies a translated field through props.onChange with i18n context', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPane({ onChange });

    await user.click(screen.getByText('Translate from EN'));

    const call = mockTranslate.mock.calls[0][0];
    call.onFieldTranslated('title', 'Bonjour le monde');

    expect(onChange).toHaveBeenCalledWith(
      fields[0],
      'Bonjour le monde',
      undefined,
      expect.objectContaining({ currentLocale: 'fr', defaultLocale: 'en', locales: ['en', 'fr'] }),
    );
  });
});
