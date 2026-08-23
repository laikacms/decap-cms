// Forces `@/core/lib/validateConfig` (which reads `I18N_STRUCTURE` at module
// eval time) to finish loading before anything reaches it via the
// i18n.tsx -> reducers/collections -> ... -> validateConfig import cycle;
// otherwise whichever module is loaded first by the test runner "wins" the
// race and validateConfig can observe an unfinished `i18n.tsx` module
// (`Object.values(undefined)`). The app's real bootstrap order always
// imports config validation before the editor, so this mirrors that.
import '@/core/lib/validateConfig';

// The per-field widget tree pulls in the real Redux store (`@/core/redux`)
// via a long import chain, which isn't needed to exercise the locale-row
// extension point tested here.
vi.mock('../EditorControl', () => ({
  default: () => null,
}));

import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ControlPane from '@/core/components/Editor/EditorControlPane/EditorControlPane';
import { registerLocaleAction, unregisterLocaleAction } from '@/core/lib/registry';

import type {
  CmsCollectionState,
  CmsEntry,
  CmsEntryField,
  CmsLocaleAction,
  CmsLocaleActionRenderProps,
} from '@/lib/util/index';

// The AI translate action that used to live in this package now ships as
// `decap-cms-ai-translate` (DCMS-1395). What this package still owns
// is the seam: resolving the i18n context and handing it to registered
// actions. That contract is what these tests pin.

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
      t={(key: string) => key}
      {...overrides}
    />,
  );
}

let seen: CmsLocaleActionRenderProps | null = null;
const registered: string[] = [];

beforeEach(() => {
  seen = null;
  vi.clearAllMocks();
});

afterEach(() => {
  // The registry is module-global; drop anything this file registered so the
  // suite stays order-independent.
  registered.splice(0).forEach(unregisterLocaleAction);
});

function registerProbe(name: string, isAvailable?: CmsLocaleAction['isAvailable']) {
  registerLocaleAction({
    name,
    ...(isAvailable ? { isAvailable } : {}),
    render: props => {
      seen = props;
      return <button type="button">{name}</button>;
    },
  });
  registered.push(name);
}

describe('EditorControlPane locale actions', () => {
  it('renders nothing extra in the locale row when no action is registered', () => {
    renderPane();

    expect(screen.queryByRole('button', { name: /^test-/ })).not.toBeInTheDocument();
  });

  it('renders a registered action and passes the resolved locale context', () => {
    registerProbe('test-basic');
    renderPane();

    expect(screen.getByRole('button', { name: 'test-basic' })).toBeInTheDocument();
    expect(seen).toMatchObject({
      sourceLocale: 'en',
      targetLocale: 'fr',
      locales: ['en', 'fr'],
    });
    expect(seen?.entry.slug).toBe('my-post');
    expect(seen?.collection.name).toBe('posts');
  });

  it('honours isAvailable, so an action can hide on the default locale', () => {
    registerProbe('test-gated', ({ sourceLocale, targetLocale }) => sourceLocale !== targetLocale);
    renderPane({ locale: 'en' });

    expect(screen.queryByRole('button', { name: 'test-gated' })).not.toBeInTheDocument();
  });

  it('resolves only translatable fields, read from the source locale', () => {
    registerProbe('test-fields');
    renderPane();

    const translatable = seen!.getTranslatableFields();

    // `internalNote` is i18n: 'none', so it is not offered for translation.
    expect(translatable).toEqual([
      expect.objectContaining({ name: 'title', value: 'Hello world' }),
    ]);
  });

  it('writes values back through onChange with the target locale i18n context', () => {
    const onChange = vi.fn();
    registerProbe('test-apply');
    renderPane({ onChange });

    seen!.applyValue('title', 'Bonjour le monde');

    expect(onChange).toHaveBeenCalledWith(
      fields[0],
      'Bonjour le monde',
      undefined,
      expect.objectContaining({ currentLocale: 'fr', defaultLocale: 'en', locales: ['en', 'fr'] }),
    );
  });

  it('ignores a write for a field that is not on the entry', () => {
    const onChange = vi.fn();
    registerProbe('test-unknown-field');
    renderPane({ onChange });

    seen!.applyValue('nope', 'value');

    expect(onChange).not.toHaveBeenCalled();
  });
});
