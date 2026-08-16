import {
  DRAFT_CHANGE_FIELD,
  DRAFT_CREATE_DUPLICATE_FROM_ENTRY,
  DRAFT_CREATE_EMPTY,
  DRAFT_CREATE_FROM_ENTRY,
  DRAFT_DISCARD,
  ENTRY_DELETE_SUCCESS,
} from '@/core/actions/entries';
import { invokeNotificationEvent } from '@/core/lib/registry';

import type { AnyAction, Middleware } from 'redux';

/**
 * Emits the editor lifecycle notification events (`CMS.registerEventListener`)
 * from the store.
 *
 * The transform events (`preSave`, `postPublish`, …) are fired from `Backend`
 * because they wrap a backend call and may rewrite the entry on its way
 * through. The lifecycle events have no such seam to sit in: an extension
 * wants to know that a draft opened or a field changed, and those happen in
 * components spread across the editor. Emitting from middleware means no
 * component has to know about the event system, and the events fire for every
 * origin — the editor UI, another extension dispatching a published action
 * creator, or a cross-tab replay.
 *
 * Handlers are observational: `invokeNotificationEvent` ignores return values
 * and swallows throws, so a misbehaving extension cannot break editing. Events
 * are emitted *after* the reducers have run, so a handler reading
 * `store.getState()` sees the post-action state.
 */
function isAction(action: unknown): action is AnyAction {
  return (
    typeof action === 'object'
    && action !== null
    && 'type' in action
    && typeof action.type === 'string'
  );
}

function emitFor(action: AnyAction) {
  switch (action.type) {
    // The three draft-opening actions disagree on payload shape: the empty and
    // duplicate ones carry the entry directly, `fromEntry` wraps it.
    case DRAFT_CREATE_EMPTY:
    case DRAFT_CREATE_DUPLICATE_FROM_ENTRY:
      return invokeNotificationEvent('entryDraftOpen', { entry: action.payload });
    case DRAFT_CREATE_FROM_ENTRY:
      return invokeNotificationEvent('entryDraftOpen', { entry: action.payload?.entry });
    case DRAFT_CHANGE_FIELD:
      return invokeNotificationEvent('entryDraftChange', {
        field: action.payload?.field,
        value: action.payload?.value,
        i18n: action.payload?.i18n,
      });
    case DRAFT_DISCARD:
      return invokeNotificationEvent('entryDraftDiscard', {});
    case ENTRY_DELETE_SUCCESS:
      return invokeNotificationEvent('postDelete', {
        collectionName: action.payload?.collectionName,
        entrySlug: action.payload?.entrySlug,
      });
    default:
      return undefined;
  }
}

export function createExtensionEventsMiddleware(): Middleware {
  return () => next => (action: unknown) => {
    const result = next(action);
    if (isAction(action)) {
      emitFor(action);
    }
    return result;
  };
}
