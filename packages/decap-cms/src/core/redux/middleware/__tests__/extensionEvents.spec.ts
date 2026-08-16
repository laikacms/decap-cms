import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DRAFT_CHANGE_FIELD,
  DRAFT_CREATE_DUPLICATE_FROM_ENTRY,
  DRAFT_CREATE_EMPTY,
  DRAFT_CREATE_FROM_ENTRY,
  DRAFT_DISCARD,
  ENTRY_DELETE_SUCCESS,
} from '@/core/actions/entries';
import { registerEventListener, removeEventListener } from '@/core/lib/registry';
import { createExtensionEventsMiddleware } from '@/core/redux/middleware/extensionEvents';

import type { AnyAction, Dispatch, MiddlewareAPI } from 'redux';

const NOTIFICATION_EVENTS = [
  'entryDraftOpen',
  'entryDraftChange',
  'entryDraftDiscard',
  'postDelete',
] as const;

function run(action: AnyAction) {
  const next = vi.fn((a: AnyAction) => a);
  const store = { getState: vi.fn(), dispatch: vi.fn() } as unknown as MiddlewareAPI<Dispatch>;
  const result = createExtensionEventsMiddleware()(store)(next as unknown as Dispatch)(action);
  return { next, result };
}

describe('extensionEvents middleware', () => {
  beforeEach(() => {
    for (const name of NOTIFICATION_EVENTS) {
      removeEventListener({ name });
    }
  });

  function listen(name: string) {
    const handler = vi.fn();
    registerEventListener({ name, handler });
    return handler;
  }

  it('passes the action through and returns next()s result', () => {
    const action = { type: 'SOMETHING_ELSE' };
    const { next, result } = run(action);

    expect(next).toHaveBeenCalledWith(action);
    expect(result).toBe(action);
  });

  it('emits nothing for an unrelated action', () => {
    const handlers = NOTIFICATION_EVENTS.map(listen);

    run({ type: 'SOMETHING_ELSE' });

    handlers.forEach(handler => expect(handler).not.toHaveBeenCalled());
  });

  it('emits entryDraftOpen for an empty draft, entry as the payload', () => {
    const handler = listen('entryDraftOpen');
    const entry = { slug: 'new', data: {} };

    run({ type: DRAFT_CREATE_EMPTY, payload: entry });

    expect(handler).toHaveBeenCalledWith({ entry }, {});
  });

  it('emits entryDraftOpen for a duplicated draft', () => {
    const handler = listen('entryDraftOpen');
    const entry = { slug: '', data: { title: 'copy' } };

    run({ type: DRAFT_CREATE_DUPLICATE_FROM_ENTRY, payload: entry });

    expect(handler).toHaveBeenCalledWith({ entry }, {});
  });

  it('emits entryDraftOpen for an existing entry, unwrapping the payload', () => {
    const handler = listen('entryDraftOpen');
    const entry = { slug: 'post', data: { title: 'Post' } };

    run({ type: DRAFT_CREATE_FROM_ENTRY, payload: { entry } });

    expect(handler).toHaveBeenCalledWith({ entry }, {});
  });

  it('emits entryDraftChange with the field, value and i18n context', () => {
    const handler = listen('entryDraftChange');
    const field = { name: 'title', widget: 'string' };
    const i18n = { currentLocale: 'nl', defaultLocale: 'en', locales: ['en', 'nl'] };

    run({
      type: DRAFT_CHANGE_FIELD,
      payload: { field, value: 'Titel', metadata: {}, entries: [], i18n },
    });

    expect(handler).toHaveBeenCalledWith({ field, value: 'Titel', i18n }, {});
  });

  it('emits entryDraftDiscard', () => {
    const handler = listen('entryDraftDiscard');

    run({ type: DRAFT_DISCARD });

    expect(handler).toHaveBeenCalledWith({}, {});
  });

  it('emits postDelete with the collection and slug', () => {
    const handler = listen('postDelete');

    run({
      type: ENTRY_DELETE_SUCCESS,
      payload: { collectionName: 'posts', entrySlug: 'hello' },
    });

    expect(handler).toHaveBeenCalledWith({ collectionName: 'posts', entrySlug: 'hello' }, {});
  });

  it('emits after the reducers have run', () => {
    const order: string[] = [];
    registerEventListener({ name: 'entryDraftDiscard', handler: () => order.push('handler') });

    const next = vi.fn(() => {
      order.push('next');
    });
    const store = { getState: vi.fn(), dispatch: vi.fn() } as unknown as MiddlewareAPI<Dispatch>;
    createExtensionEventsMiddleware()(store)(next as unknown as Dispatch)({ type: DRAFT_DISCARD });

    expect(order).toEqual(['next', 'handler']);
  });

  it('does not let a throwing handler break dispatch', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerEventListener({
      name: 'entryDraftDiscard',
      handler: () => {
        throw new Error('extension blew up');
      },
    });

    expect(() => run({ type: DRAFT_DISCARD })).not.toThrow();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
