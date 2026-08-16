import { Registry } from '@laikacms/decap-cms/core';
import { describe, expect, it } from 'vitest';

import { AI_TRANSLATE_ACTION_NAME, registerAiTranslate } from '../index';

describe('registerAiTranslate', () => {
  it('registers the locale action', () => {
    registerAiTranslate();

    const action = Registry.getLocaleActions().find(a => a.name === AI_TRANSLATE_ACTION_NAME);

    expect(action).toBeDefined();
    expect(typeof action?.render).toBe('function');
  });

  it('is idempotent, so multiple entry points may call it', () => {
    // The CMS throws on duplicate action names, so a second call must be a
    // no-op rather than a second registration.
    expect(() => registerAiTranslate()).not.toThrow();

    const matches = Registry.getLocaleActions().filter(a => a.name === AI_TRANSLATE_ACTION_NAME);

    expect(matches).toHaveLength(1);
  });

  it('hides the action while the default locale is selected', () => {
    const action = Registry.getLocaleActions().find(a => a.name === AI_TRANSLATE_ACTION_NAME);
    const context = { locales: ['en', 'nl'], collection: {} as never };

    expect(action?.isAvailable?.({ ...context, sourceLocale: 'en', targetLocale: 'en' })).toBe(false);
    expect(action?.isAvailable?.({ ...context, sourceLocale: 'en', targetLocale: 'nl' })).toBe(true);
  });

  it('adds its phrases without dropping phrases already registered for that locale', () => {
    // The action's strings are registered onto locales the CMS also writes to,
    // so registerLocale has to merge. If it ever goes back to replacing, this
    // catches it.
    Registry.registerLocale('en', { app: { header: { content: 'Content' } } } as never);
    registerAiTranslate();

    const en = Registry.getLocale('en') as Record<string, any>;

    expect(en.app.header.content).toBe('Content');
    expect(en.editor.editorControlPane.i18n.translateFromDefault).toBe('Translate from %{locale}');
  });
});
