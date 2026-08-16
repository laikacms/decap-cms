import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('registerLocale', () => {
    it('should log error when name is empty', async () => {
      const { registerLocale } = await import('@/core/lib/registry');

      registerLocale();
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "Locale parameters invalid. example: CMS.registerLocale('locale', phrases)",
      );
    });

    it('should log error when phrases are undefined', async () => {
      const { registerLocale } = await import('@/core/lib/registry');

      registerLocale('fr');
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "Locale parameters invalid. example: CMS.registerLocale('locale', phrases)",
      );
    });

    it('should register locale', async () => {
      const { registerLocale, getLocale } = await import('@/core/lib/registry');

      const phrases = {
        app: {
          header: {
            content: 'Inhalt',
          },
        },
      };

      registerLocale('de', phrases);

      // Value equality, not identity: registerLocale merges into whatever is
      // already registered for the locale, so the stored object is a new one.
      expect(getLocale('de')).toEqual(phrases);
    });

    it('merges into phrases already registered for the same locale', async () => {
      const { registerLocale, getLocale } = await import('@/core/lib/registry');

      registerLocale('nl', { app: { header: { content: 'Inhoud' } } });
      registerLocale('nl', { editor: { editorControlPane: { i18n: { copyFromLocale: 'Kopieer' } } } });

      expect(getLocale('nl')).toEqual({
        app: { header: { content: 'Inhoud' } },
        editor: { editorControlPane: { i18n: { copyFromLocale: 'Kopieer' } } },
      });
    });
  });

  describe('registerLocaleAction', () => {
    it('registers, reads back and unregisters an action', async () => {
      const { registerLocaleAction, getLocaleActions, unregisterLocaleAction } = await import(
        '@/core/lib/registry'
      );
      const action = { name: 'probe', render: () => null };

      registerLocaleAction(action);
      expect(getLocaleActions().find(a => a.name === 'probe')).toBe(action);

      unregisterLocaleAction('probe');
      expect(getLocaleActions().find(a => a.name === 'probe')).toBeUndefined();
    });

    it('rejects a duplicate name and an action without a render function', async () => {
      const { registerLocaleAction, unregisterLocaleAction } = await import('@/core/lib/registry');

      registerLocaleAction({ name: 'dupe', render: () => null });

      expect(() => registerLocaleAction({ name: 'dupe', render: () => null })).toThrow(
        /already been registered/,
      );
      expect(() => registerLocaleAction({ name: 'broken' } as never)).toThrow(/parameters invalid/);

      unregisterLocaleAction('dupe');
    });
  });

  describe('registerWidget / resolveWidget', () => {
    it('resolves widget: markdown to the richtext control via the back-compat alias (DCMS-483)', async () => {
      const { registerWidget, resolveWidget } = await import('@/core/lib/registry');

      const richtextControl = () => null;
      const markdownAliasControl = () => null;

      registerWidget({ name: 'richtext', controlComponent: richtextControl });
      registerWidget({ name: 'markdown', controlComponent: markdownAliasControl });

      const resolved = resolveWidget('markdown');

      expect(resolved).toBeDefined();
      expect(resolved?.control).toBe(markdownAliasControl);
    });

    it('warns once per session when a markdown widget field is resolved', async () => {
      const { registerWidget, resolveWidget } = await import('@/core/lib/registry');

      registerWidget({ name: 'markdown', controlComponent: () => null });

      resolveWidget('markdown');
      resolveWidget('markdown');

      const deprecationWarnings = (console.warn as ReturnType<typeof vi.fn>).mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('widget: markdown'),
      );
      expect(deprecationWarnings).toHaveLength(1);
    });

    it('does not warn for the richtext widget itself', async () => {
      const { registerWidget, resolveWidget } = await import('@/core/lib/registry');

      registerWidget({ name: 'richtext', controlComponent: () => null });

      resolveWidget('richtext');

      const deprecationWarnings = (console.warn as ReturnType<typeof vi.fn>).mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('widget: markdown'),
      );
      expect(deprecationWarnings).toHaveLength(0);
    });
  });

  describe('registerCustomFormat', () => {
    it('can register a custom format', async () => {
      const { getCustomFormats, registerCustomFormat } = await import('@/core/lib/registry');

      expect(Object.keys(getCustomFormats())).not.toContain('querystring');

      registerCustomFormat('querystring', 'qs', {
        fromFile: content => Object.fromEntries(new URLSearchParams(content)),
        toFile: obj => new URLSearchParams(obj).toString(),
      });

      expect(Object.keys(getCustomFormats())).toContain('querystring');
    });
  });

  describe('registerEntryCodec', () => {
    it('logs an error and registers nothing when name is missing', async () => {
      const { registerEntryCodec, getEntryCodecs } = await import('@/core/lib/registry');

      const before = getEntryCodecs().length;

      registerEntryCodec({ formatter: { fromFile: () => ({}), toFile: () => '' } } as any);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "Entry format parameters invalid. example: CMS.registerEntryCodec({ name: 'yaml', fileExtensions: ['yml'], defaultExtension: 'yml', formatter })",
      );
      expect(getEntryCodecs()).toHaveLength(before);
    });

    it('logs an error and registers nothing when formatter is missing', async () => {
      const { registerEntryCodec, getEntryCodecs } = await import('@/core/lib/registry');

      const before = getEntryCodecs().length;

      registerEntryCodec({ name: 'broken', fileExtensions: ['brk'], defaultExtension: 'brk' } as any);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "Entry format parameters invalid. example: CMS.registerEntryCodec({ name: 'yaml', fileExtensions: ['yml'], defaultExtension: 'yml', formatter })",
      );
      expect(getEntryCodecs()).toHaveLength(before);
    });

    it('registers a valid codec, retrievable by name', async () => {
      const { registerEntryCodec, getEntryCodec } = await import('@/core/lib/registry');

      const formatter = { fromFile: () => ({}), toFile: () => '' };
      registerEntryCodec({
        name: 'my-format',
        fileExtensions: ['myext'],
        defaultExtension: 'myext',
        formatter,
      });

      expect(getEntryCodec('my-format')).toEqual({
        name: 'my-format',
        fileExtensions: ['myext'],
        defaultExtension: 'myext',
        formatter,
      });
    });
  });

  describe('eventHandlers', () => {
    const events = [
      'prePublish',
      'postPublish',
      'preUnpublish',
      'postUnpublish',
      'preSave',
      'postSave',
    ];

    const notifications = [
      'entryDraftOpen',
      'entryDraftChange',
      'entryDraftDiscard',
      'postDelete',
    ];

    describe('registerEventListener', () => {
      it('should throw error on invalid event', async () => {
        const { registerEventListener } = await import('@/core/lib/registry');

        expect(() => registerEventListener({ name: 'unknown' })).toThrow(
          new Error("Invalid event name 'unknown'"),
        );
      });

      [...events, ...notifications].forEach(name => {
        it(`should register '${name}' event`, async () => {
          const { registerEventListener, getEventListeners } = await import('@/core/lib/registry');

          const handler = vi.fn();
          registerEventListener({ name, handler });

          expect(getEventListeners(name)).toEqual([{ handler, options: {} }]);
        });
      });
    });

    describe('removeEventListener', () => {
      it('should throw error on invalid event', async () => {
        const { removeEventListener } = await import('@/core/lib/registry');

        expect(() => removeEventListener({ name: 'unknown' })).toThrow(
          new Error("Invalid event name 'unknown'"),
        );
      });

      events.forEach(name => {
        it(`should remove '${name}' event by handler`, async () => {
          const { registerEventListener, getEventListeners, removeEventListener } = await import('@/core/lib/registry');

          const handler1 = vi.fn();
          const handler2 = vi.fn();
          registerEventListener({ name, handler: handler1 });
          registerEventListener({ name, handler: handler2 });

          expect(getEventListeners(name)).toHaveLength(2);

          removeEventListener({ name, handler: handler1 });

          expect(getEventListeners(name)).toEqual([{ handler: handler2, options: {} }]);
        });
      });

      events.forEach(name => {
        it(`should remove '${name}' event by name`, async () => {
          const { registerEventListener, getEventListeners, removeEventListener } = await import('@/core/lib/registry');

          const handler1 = vi.fn();
          const handler2 = vi.fn();
          registerEventListener({ name, handler: handler1 });
          registerEventListener({ name, handler: handler2 });

          expect(getEventListeners(name)).toHaveLength(2);

          removeEventListener({ name });

          expect(getEventListeners(name)).toHaveLength(0);
        });
      });
    });

    describe('invokeEvent', () => {
      it('should throw error on invalid event', async () => {
        const { invokeEvent } = await import('@/core/lib/registry');

        await expect(invokeEvent({ name: 'unknown', data: {} })).rejects.toThrow(
          new Error("Invalid event name 'unknown'"),
        );
      });

      events.forEach(name => {
        it(`should invoke '${name}' event with data`, async () => {
          const { registerEventListener, invokeEvent } = await import('@/core/lib/registry');

          const options = { hello: 'world' };
          const handler = vi.fn();

          registerEventListener({ name, handler }, options);

          const data = { entry: { data: {} } };
          await invokeEvent({ name, data });

          expect(handler).toHaveBeenCalledTimes(1);
          expect(handler).toHaveBeenCalledWith(data, options);
        });

        it(`should invoke multiple handlers on '${name}`, async () => {
          const { registerEventListener, invokeEvent } = await import('@/core/lib/registry');

          const options1 = { hello: 'test1' };
          const options2 = { hello: 'test2' };
          const handler = vi.fn(({ entry }) => entry.data);

          registerEventListener({ name, handler }, options1);
          registerEventListener({ name, handler }, options2);

          const data = { entry: { data: {} } };
          await invokeEvent({ name, data });

          expect(handler).toHaveBeenCalledTimes(2);
          expect(handler).toHaveBeenLastCalledWith(data, options2);
        });

        it(`should throw error when '${name}' handler throws error`, async () => {
          const { registerEventListener, invokeEvent } = await import('@/core/lib/registry');

          const handler = vi.fn(() => {
            throw new Error('handler failed!');
          });

          registerEventListener({ name, handler });
          const data = { entry: { data: {} } };

          await expect(invokeEvent({ name, data })).rejects.toThrow('handler failed!');
        });
      });

      it(`should return the complete updated entry object`, async () => {
        const { registerEventListener, invokeEvent } = await import('@/core/lib/registry');

        const event = 'preSave';
        const options = { hello: 'world' };
        const handler1 = vi.fn(({ entry }) => {
          return { ...entry.data, a: 'test1' };
        });
        const handler2 = vi.fn(({ entry }) => {
          return { ...entry.data, c: 'test2' };
        });

        registerEventListener({ name: event, handler: handler1 }, options);
        registerEventListener({ name: event, handler: handler2 }, options);

        const data = {
          entry: { data: { a: 'foo', b: 'bar' } },
        };

        const dataAfterFirstHandlerExecution = {
          entry: { data: { a: 'test1', b: 'bar' } },
        };
        const dataAfterSecondHandlerExecution = {
          entry: { data: { a: 'test1', b: 'bar', c: 'test2' } },
        };

        const result = await invokeEvent({ name: event, data });

        expect(handler1).toHaveBeenCalledWith(data, options);
        expect(handler2).toHaveBeenCalledWith(dataAfterFirstHandlerExecution, options);

        expect(result).toEqual(dataAfterSecondHandlerExecution.entry);
      });

      it('should allow multiple events to not return a value', async () => {
        const { registerEventListener, invokeEvent } = await import('@/core/lib/registry');

        const event = 'prePublish';
        const options = { hello: 'world' };
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        registerEventListener({ name: event, handler: handler1 }, options);
        registerEventListener({ name: event, handler: handler2 }, options);

        const data = {
          entry: { data: { a: 'foo', b: 'bar' } },
        };
        const result = await invokeEvent({ name: event, data });

        expect(handler1).toHaveBeenCalledWith(data, options);
        expect(handler2).toHaveBeenCalledWith(data, options);
        expect(result).toEqual(data.entry);
      });

      it('rejects a notification event name', async () => {
        const { invokeEvent } = await import('@/core/lib/registry');

        await expect(invokeEvent({ name: 'entryDraftChange', data: {} })).rejects.toThrow(
          "'entryDraftChange' is a notification event",
        );
      });
    });

    describe('invokeNotificationEvent', () => {
      it('should throw error on invalid event', async () => {
        const { invokeNotificationEvent } = await import('@/core/lib/registry');

        expect(() => invokeNotificationEvent('unknown', {})).toThrow(
          new Error("Invalid event name 'unknown'"),
        );
      });

      it('rejects a transform event name', async () => {
        const { invokeNotificationEvent } = await import('@/core/lib/registry');

        expect(() => invokeNotificationEvent('preSave', {})).toThrow(
          "'preSave' is a transform event",
        );
      });

      notifications.forEach(name => {
        it(`should invoke '${name}' handlers in registration order with data`, async () => {
          const { registerEventListener, invokeNotificationEvent } = await import('@/core/lib/registry');

          const calls: string[] = [];
          const options = { hello: 'world' };
          const handler1 = vi.fn(() => calls.push('first'));
          const handler2 = vi.fn(() => calls.push('second'));

          registerEventListener({ name, handler: handler1 }, options);
          registerEventListener({ name, handler: handler2 });

          const data = { entry: { data: {} } };
          invokeNotificationEvent(name, data);

          expect(handler1).toHaveBeenCalledWith(data, options);
          expect(handler2).toHaveBeenCalledWith(data, {});
          expect(calls).toEqual(['first', 'second']);
        });
      });

      it('ignores handler return values', async () => {
        const { registerEventListener, invokeNotificationEvent } = await import('@/core/lib/registry');

        const handler = vi.fn(() => ({ replaced: true }));
        registerEventListener({ name: 'entryDraftChange', handler });

        expect(invokeNotificationEvent('entryDraftChange', { value: 'x' })).toBeUndefined();
      });

      it('logs and continues when a handler throws', async () => {
        const { registerEventListener, invokeNotificationEvent } = await import('@/core/lib/registry');

        const thrower = vi.fn(() => {
          throw new Error('handler failed!');
        });
        const after = vi.fn();

        registerEventListener({ name: 'postDelete', handler: thrower });
        registerEventListener({ name: 'postDelete', handler: after });

        expect(() => invokeNotificationEvent('postDelete', { entrySlug: 'a' })).not.toThrow();
        expect(after).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith(
          "Error in 'postDelete' event handler",
          expect.any(Error),
        );
      });

      it('logs a rejected promise without unhandled rejection', async () => {
        const { registerEventListener, invokeNotificationEvent } = await import('@/core/lib/registry');

        registerEventListener({
          name: 'entryDraftDiscard',
          handler: () => Promise.reject(new Error('async failure')),
        });

        invokeNotificationEvent('entryDraftDiscard', {});
        await Promise.resolve();
        await Promise.resolve();

        expect(console.error).toHaveBeenCalledWith(
          "Error in 'entryDraftDiscard' event handler",
          expect.any(Error),
        );
      });
    });
  });

  describe('README event documentation pinning (DCMS-529)', () => {
    function readCoreReadme() {
      const readmePath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../README.md',
      );
      return readFileSync(readmePath, 'utf-8');
    }

    /**
     * Pulls the `| \`event\` | ... |` rows out of one `###` section of
     * src/core/README.md, so the two event tables are pinned independently.
     */
    function eventRowsInSection(readme: string, heading: string) {
      const marker = `### ${heading}`;
      const start = readme.indexOf(marker);
      expect(start).toBeGreaterThan(-1);
      const rest = readme.slice(start + marker.length);
      const end = rest.search(/^#{1,3} /m);
      const section = end === -1 ? rest : rest.slice(0, end);

      return [...section.matchAll(/^\| `(\w+)`\s+\| .+ \|$/gm)].map(match => match[1]);
    }

    it('documents exactly the events in `allowedEvents`, in firing order', async () => {
      const { allowedEvents } = await import('@/core/lib/registry');

      expect(eventRowsInSection(readCoreReadme(), 'Transform events')).toEqual(allowedEvents);
    });

    it('documents exactly the events in `notificationEvents`', async () => {
      const { notificationEvents } = await import('@/core/lib/registry');

      expect(eventRowsInSection(readCoreReadme(), 'Notification events')).toEqual(
        notificationEvents,
      );
    });
  });
});
