import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AiTranslateAction, {
  buildTranslatePrompt,
} from '@/core/components/Editor/EditorControlPane/AiTranslateAction';
import { I18n } from '@/core/i18n';
import { LlmTransportProvider } from '@/core/lib/llm';
import { LlmSessionProvider } from '@/core/lib/llmSession';
import en from '@/locales/en/index';

import type {
  CmsCollectionState,
  CmsEntry,
  CmsTranslatableField,
  LlmSession,
  LlmTransport,
} from '@/lib/util/index';
import type { Store } from 'redux';

/**
 * The translate action is now a thin thing: it builds a prompt, pushes it into
 * the shared session, and lets the transport's document tool do the writing.
 * These pin that it stays thin — no transport, no parsing, no patching here.
 */

vi.mock('@/ui', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirmDialog: vi.fn(async () => true),
}));

const { confirmDialog } = await import('@/ui');

const collection = { name: 'posts', type: 'folder_based_collection' } as unknown as CmsCollectionState;
const entry = { slug: 'hello', collection: 'posts', data: {} } as unknown as CmsEntry;

const translatableFields: CmsTranslatableField[] = [
  { name: 'title', field: { name: 'title', widget: 'string' }, value: 'Hello' },
];

function makeStore(): Store {
  return {
    getState: () => ({ entries: { entities: {} }, editorialWorkflow: { entities: {} } }),
    dispatch: (action: unknown) => action,
    subscribe: () => () => {},
    replaceReducer: () => {},
  } as unknown as Store;
}

function createFakeSession(overrides: Partial<LlmSession> = {}) {
  return {
    messages: [],
    status: 'idle',
    sendPrompt: vi.fn(async () => {}),
    subscribe: () => () => {},
    ...overrides,
  } as unknown as LlmSession;
}

function renderAction({
  transport,
  sourceLocale = 'en',
  targetLocale = 'nl',
  fields = translatableFields,
}: {
  transport?: LlmTransport | undefined,
  sourceLocale?: string,
  targetLocale?: string,
  fields?: CmsTranslatableField[],
}) {
  const getTranslatableFields = vi.fn(() => fields);

  render(
    <Provider store={makeStore()}>
      <I18n locale="en" messages={en}>
        <LlmTransportProvider llm={transport}>
          <LlmSessionProvider collection={collection} entry={entry} locale={targetLocale}>
            <AiTranslateAction
              collection={collection}
              entry={entry}
              sourceLocale={sourceLocale}
              targetLocale={targetLocale}
              locales={['en', 'nl']}
              getTranslatableFields={getTranslatableFields}
              applyValue={vi.fn()}
              t={((key: string, options?: Record<string, string>) =>
                options?.locale ? `${key}:${options.locale}` : key) as never}
            />
          </LlmSessionProvider>
        </LlmTransportProvider>
      </I18n>
    </Provider>,
  );

  return { getTranslatableFields };
}

const TRANSLATE_LABEL = /translateFromDefault:EN/;

afterEach(() => {
  vi.mocked(confirmDialog).mockClear();
  vi.mocked(confirmDialog).mockResolvedValue(true);
});

describe('AiTranslateAction', () => {
  it('renders nothing without a transport', () => {
    renderAction({ transport: undefined });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing when the target locale is the source locale', () => {
    renderAction({
      transport: { openSession: () => createFakeSession() },
      sourceLocale: 'en',
      targetLocale: 'en',
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('sends one hidden prompt into the shared session', async () => {
    const user = userEvent.setup();
    const session = createFakeSession();
    renderAction({ transport: { openSession: () => session } });

    await user.click(screen.getByRole('button', { name: TRANSLATE_LABEL }));

    await waitFor(() => expect(session.sendPrompt).toHaveBeenCalledTimes(1));
    const [prompt, options] = vi.mocked(session.sendPrompt).mock.calls[0];
    expect(prompt).toContain('"title": "Hello"');
    expect(prompt).toContain('"en" to locale "nl"');
    // Hidden: the generated instruction must not clutter the chat transcript.
    expect(options).toEqual({ visible: false });
  });

  it('confirms before overwriting, and does nothing when declined', async () => {
    const user = userEvent.setup();
    const session = createFakeSession();
    vi.mocked(confirmDialog).mockResolvedValue(false);
    renderAction({ transport: { openSession: () => session } });

    await user.click(screen.getByRole('button', { name: TRANSLATE_LABEL }));

    expect(confirmDialog).toHaveBeenCalled();
    expect(session.sendPrompt).not.toHaveBeenCalled();
  });

  it('does nothing when there is nothing translatable', async () => {
    const user = userEvent.setup();
    const session = createFakeSession();
    renderAction({ transport: { openSession: () => session }, fields: [] });

    await user.click(screen.getByRole('button', { name: TRANSLATE_LABEL }));

    expect(confirmDialog).not.toHaveBeenCalled();
    expect(session.sendPrompt).not.toHaveBeenCalled();
  });

  it('asks for the fields for the current locale pair', async () => {
    const user = userEvent.setup();
    const { getTranslatableFields } = renderAction({
      transport: { openSession: () => createFakeSession() },
    });

    await user.click(screen.getByRole('button', { name: TRANSLATE_LABEL }));

    expect(getTranslatableFields).toHaveBeenCalledWith('en', 'nl');
  });

  it('surfaces a failure without breaking the locale row', async () => {
    const user = userEvent.setup();
    const session = createFakeSession({
      sendPrompt: vi.fn(async () => {
        throw new Error('model unavailable');
      }),
    });
    renderAction({ transport: { openSession: () => session } });

    await user.click(screen.getByRole('button', { name: TRANSLATE_LABEL }));

    expect(await screen.findByRole('alert')).toHaveTextContent('translateFailed');
    expect(screen.getByRole('button', { name: TRANSLATE_LABEL })).toBeInTheDocument();
  });

  it('reuses the session the chat panel would use', async () => {
    const user = userEvent.setup();
    const session = createFakeSession();
    const openSession = vi.fn(() => session);
    renderAction({ transport: { openSession } });

    await user.click(screen.getByRole('button', { name: TRANSLATE_LABEL }));

    // One session per entry: a translation is a turn in the conversation, so
    // the user can follow it up in the chat panel.
    await waitFor(() => expect(openSession).toHaveBeenCalledTimes(1));
  });
});

describe('buildTranslatePrompt', () => {
  it('asks for updateDocument tool calls rather than prose', () => {
    const prompt = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'de',
      fields: [{ name: 'title', value: 'Hello' }],
    });

    expect(prompt).toContain('updateDocument');
    expect(prompt).toContain('JSON Patch');
    expect(prompt).toContain('- "title": "Hello"');
  });

  it('serializes non-string values so structure survives the round trip', () => {
    const prompt = buildTranslatePrompt({
      sourceLocale: 'en',
      targetLocale: 'de',
      fields: [{ name: 'tags', value: ['a', 'b'] }],
    });

    expect(prompt).toContain('- "tags": ["a","b"]');
  });
});
