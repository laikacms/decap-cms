jest.spyOn(console, 'error').mockImplementation(() => {});

describe('registry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('registerLocale', () => {
    it('should log error when name is empty', () => {
      const { registerLocale } = require('../registry');

      registerLocale();
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "Locale parameters invalid. example: CMS.registerLocale('locale', phrases)",
      );
    });

    it('should log error when phrases are undefined', () => {
      const { registerLocale } = require('../registry');

      registerLocale('fr');
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        "Locale parameters invalid. example: CMS.registerLocale('locale', phrases)",
      );
    });

    it('should register locale', () => {
      const { registerLocale, getLocale } = require('../registry');

      const phrases = {
        app: {
          header: {
            content: 'Inhalt',
          },
        },
      };

      registerLocale('de', phrases);

      expect(getLocale('de')).toBe(phrases);
    });
  });

  describe('registerCustomFormat', () => {
    it('can register a custom format', () => {
      const { getCustomFormats, registerCustomFormat } = require('../registry');

      expect(Object.keys(getCustomFormats())).not.toContain('querystring');

      registerCustomFormat('querystring', 'qs', {
        fromFile: content => Object.fromEntries(new URLSearchParams(content)),
        toFile: obj => new URLSearchParams(obj).toString(),
      });

      expect(Object.keys(getCustomFormats())).toContain('querystring');
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

    describe('registerEventListener', () => {
      it('should throw error on invalid event', () => {
        const { registerEventListener } = require('../registry');

        expect(() => registerEventListener({ name: 'unknown' })).toThrow(
          new Error("Invalid event name 'unknown'"),
        );
      });

      events.forEach(name => {
        it(`should register '${name}' event`, () => {
          const { registerEventListener, getEventListeners } = require('../registry');

          const handler = jest.fn();
          registerEventListener({ name, handler });

          expect(getEventListeners(name)).toEqual([{ handler, options: {} }]);
        });
      });
    });

    describe('removeEventListener', () => {
      it('should throw error on invalid event', () => {
        const { removeEventListener } = require('../registry');

        expect(() => removeEventListener({ name: 'unknown' })).toThrow(
          new Error("Invalid event name 'unknown'"),
        );
      });

      events.forEach(name => {
        it(`should remove '${name}' event by handler`, () => {
          const {
            registerEventListener,
            getEventListeners,
            removeEventListener,
          } = require('../registry');

          const handler1 = jest.fn();
          const handler2 = jest.fn();
          registerEventListener({ name, handler: handler1 });
          registerEventListener({ name, handler: handler2 });

          expect(getEventListeners(name)).toHaveLength(2);

          removeEventListener({ name, handler: handler1 });

          expect(getEventListeners(name)).toEqual([{ handler: handler2, options: {} }]);
        });
      });

      events.forEach(name => {
        it(`should remove '${name}' event by name`, () => {
          const {
            registerEventListener,
            getEventListeners,
            removeEventListener,
          } = require('../registry');

          const handler1 = jest.fn();
          const handler2 = jest.fn();
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
        const { invokeEvent } = require('../registry');

        await expect(invokeEvent({ name: 'unknown', data: {} })).rejects.toThrow(
          new Error("Invalid event name 'unknown'"),
        );
      });

      events.forEach(name => {
        it(`should invoke '${name}' event with data`, async () => {
          const { registerEventListener, invokeEvent } = require('../registry');

          const options = { hello: 'world' };
          const handler = jest.fn();

          registerEventListener({ name, handler }, options);

          const data = { entry: { data: {} } };
          await invokeEvent({ name, data });

          expect(handler).toHaveBeenCalledTimes(1);
          expect(handler).toHaveBeenCalledWith(data, options);
        });

        it(`should invoke multiple handlers on '${name}`, async () => {
          const { registerEventListener, invokeEvent } = require('../registry');

          const options1 = { hello: 'test1' };
          const options2 = { hello: 'test2' };
          const handler = jest.fn(({ entry }) => entry.data);

          registerEventListener({ name, handler }, options1);
          registerEventListener({ name, handler }, options2);

          const data = { entry: { data: {} } };
          await invokeEvent({ name, data });

          expect(handler).toHaveBeenCalledTimes(2);
          expect(handler).toHaveBeenLastCalledWith(data, options2);
        });

        it(`should throw error when '${name}' handler throws error`, async () => {
          const { registerEventListener, invokeEvent } = require('../registry');

          const handler = jest.fn(() => {
            throw new Error('handler failed!');
          });

          registerEventListener({ name, handler });
          const data = { entry: { data: {} } };

          await expect(invokeEvent({ name, data })).rejects.toThrow('handler failed!');
        });
      });

      it(`should return the complete updated entry object`, async () => {
        const { registerEventListener, invokeEvent } = require('../registry');

        const event = 'preSave';
        const options = { hello: 'world' };
        const handler1 = jest.fn(({ entry }) => {
          const data = entry.data;
          return { ...data, a: 'test1' };
        });
        const handler2 = jest.fn(({ entry }) => {
          const data = entry.data;
          return { ...data, c: 'test2' };
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
        const { registerEventListener, invokeEvent } = require('../registry');

        const event = 'prePublish';
        const options = { hello: 'world' };
        const handler1 = jest.fn();
        const handler2 = jest.fn();

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
    });
  });

  describe('registerWidget / getWidget / getWidgets / resolveWidget', () => {
    it('registers a widget by string name with control and preview', () => {
      const { registerWidget, getWidget } = require('../registry');
      const control = jest.fn();
      const preview = jest.fn();

      registerWidget('text', control, preview);

      const widget = getWidget('text');
      expect(widget.control).toBe(control);
      expect(widget.preview).toBe(preview);
    });

    it('registers a widget by object descriptor', () => {
      const { registerWidget, getWidget } = require('../registry');
      const control = jest.fn();
      const preview = jest.fn();

      registerWidget({ name: 'myWidget', controlComponent: control, previewComponent: preview });

      const widget = getWidget('myWidget');
      expect(widget.control).toBe(control);
      expect(widget.preview).toBe(preview);
    });

    it('overwriting an object-style widget emits a console.warn', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { registerWidget } = require('../registry');
      const control = jest.fn();

      registerWidget({ name: 'dup', controlComponent: control });
      registerWidget({ name: 'dup', controlComponent: control });

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0][0]).toMatch(/dup/);
    });

    it('throws when object-style widget is missing controlComponent', () => {
      const { registerWidget } = require('../registry');

      expect(() => registerWidget({ name: 'bad' })).toThrow(
        'Widget "bad" registered without `controlComponent`.',
      );
    });

    it('getWidgets returns all registered widgets with their names', () => {
      const { registerWidget, getWidgets } = require('../registry');
      const controlA = jest.fn();
      const controlB = jest.fn();

      registerWidget('alpha', controlA, null);
      registerWidget('beta', controlB, null);

      const widgets = getWidgets();
      const names = widgets.map(w => w.name);
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
    });

    it('resolveWidget returns the named widget when it exists', () => {
      const { registerWidget, resolveWidget } = require('../registry');
      const control = jest.fn();

      registerWidget('string', control, null);

      expect(resolveWidget('string').control).toBe(control);
    });

    it('resolveWidget falls back to the "unknown" widget for unregistered names', () => {
      const { registerWidget, resolveWidget } = require('../registry');
      const unknownControl = jest.fn();

      registerWidget('unknown', unknownControl, null);

      const result = resolveWidget('totally-unknown-widget-xyz');
      expect(result.control).toBe(unknownControl);
    });

    it('resolveWidget with no argument falls back to "string" widget', () => {
      const { registerWidget, resolveWidget } = require('../registry');
      const stringControl = jest.fn();

      registerWidget('string', stringControl, null);

      expect(resolveWidget(undefined).control).toBe(stringControl);
    });

    it('registers widget schema and exposes it', () => {
      const { registerWidget, getWidget } = require('../registry');
      const schema = { properties: { foo: { type: 'string' } } };

      registerWidget({ name: 'schemaWidget', controlComponent: jest.fn(), schema });

      expect(getWidget('schemaWidget').schema).toEqual(schema);
    });

    it('string-name registration can reuse control from another widget', () => {
      const { registerWidget, getWidget } = require('../registry');
      const originalControl = jest.fn();
      const newPreview = jest.fn();

      registerWidget('base', originalControl, null);
      registerWidget('derived', 'base', newPreview);

      expect(getWidget('derived').control).toBe(originalControl);
      expect(getWidget('derived').preview).toBe(newPreview);
    });
  });

  describe('registerBackend / getBackend', () => {
    it('registers and retrieves a backend', () => {
      const { registerBackend, getBackend } = require('../registry');

      class MyBackend {}
      registerBackend('myBackend', MyBackend);

      const backend = getBackend('myBackend');
      expect(backend).toBeDefined();
      expect(typeof backend.init).toBe('function');
    });

    it('init creates an instance of the backend class', () => {
      const { registerBackend, getBackend } = require('../registry');

      class MyBackend {
        constructor(config) {
          this.config = config;
        }
      }
      registerBackend('myBackend2', MyBackend);

      const instance = getBackend('myBackend2').init({ option: true });
      expect(instance).toBeInstanceOf(MyBackend);
      expect(instance.config).toEqual({ option: true });
    });

    it('returns undefined for an unregistered backend name', () => {
      const { getBackend } = require('../registry');

      expect(getBackend('nonExistent')).toBeUndefined();
    });

    it('logs error when registering a duplicate backend name', () => {
      const { registerBackend } = require('../registry');

      class BackendA {}
      class BackendB {}
      registerBackend('dupBackend', BackendA);
      registerBackend('dupBackend', BackendB);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error.mock.calls[0][0]).toMatch(/dupBackend/);
    });

    it('logs error when called without arguments', () => {
      const { registerBackend } = require('../registry');

      registerBackend();

      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerMediaLibrary / getMediaLibrary', () => {
    it('registers and retrieves a media library by name', () => {
      const { registerMediaLibrary, getMediaLibrary } = require('../registry');

      const lib = { name: 'cloudinary', config: {} };
      registerMediaLibrary(lib);

      expect(getMediaLibrary('cloudinary')).toMatchObject({ name: 'cloudinary' });
    });

    it('passes options alongside the media library', () => {
      const { registerMediaLibrary, getMediaLibrary } = require('../registry');

      const lib = { name: 'uploadcare' };
      const options = { publicKey: 'abc123' };
      registerMediaLibrary(lib, options);

      expect(getMediaLibrary('uploadcare').options).toEqual(options);
    });

    it('returns undefined for an unregistered media library', () => {
      const { getMediaLibrary } = require('../registry');

      expect(getMediaLibrary('notRegistered')).toBeUndefined();
    });

    it('throws when registering a duplicate media library name', () => {
      const { registerMediaLibrary } = require('../registry');

      const lib = { name: 'dupLib' };
      registerMediaLibrary(lib);

      expect(() => registerMediaLibrary(lib)).toThrow(
        'A media library named dupLib has already been registered.',
      );
    });
  });

  describe('registerEditorComponent / getEditorComponents', () => {
    it('returns an empty map before any components are registered', () => {
      const { getEditorComponents } = require('../registry');

      expect(Object.keys(getEditorComponents())).toHaveLength(0);
    });

    it('registers an editor component and retrieves it', () => {
      const { registerEditorComponent, getEditorComponents } = require('../registry');

      registerEditorComponent({
        id: 'youtube',
        label: 'YouTube',
        fields: [],
        pattern: /x/,
        fromBlock: jest.fn(),
        toBlock: jest.fn(),
      });

      const components = getEditorComponents();
      expect('youtube' in components).toBe(true);
    });

    it('registers multiple editor components', () => {
      const { registerEditorComponent, getEditorComponents } = require('../registry');

      registerEditorComponent({
        id: 'comp1',
        label: 'Comp1',
        fields: [],
        pattern: /a/,
        fromBlock: jest.fn(),
        toBlock: jest.fn(),
      });
      registerEditorComponent({
        id: 'comp2',
        label: 'Comp2',
        fields: [],
        pattern: /b/,
        fromBlock: jest.fn(),
        toBlock: jest.fn(),
      });

      expect(Object.keys(getEditorComponents())).toHaveLength(2);
    });

    it('a second code-block component replaces the first and emits console.warn', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { registerEditorComponent, getEditorComponents } = require('../registry');

      registerEditorComponent({
        id: 'cb1',
        label: 'CB1',
        type: 'code-block',
        fields: [],
        pattern: /a/,
        fromBlock: jest.fn(),
        toBlock: jest.fn(),
      });
      registerEditorComponent({
        id: 'cb2',
        label: 'CB2',
        type: 'code-block',
        fields: [],
        pattern: /b/,
        fromBlock: jest.fn(),
        toBlock: jest.fn(),
      });

      expect(console.warn).toHaveBeenCalledTimes(1);
      const components = getEditorComponents();
      expect('cb1' in components).toBe(false);
      expect('cb2' in components).toBe(true);
    });
  });

  describe('registerWidgetValueSerializer / getWidgetValueSerializer', () => {
    it('returns undefined for an unregistered widget name', () => {
      const { getWidgetValueSerializer } = require('../registry');

      expect(getWidgetValueSerializer('custom')).toBeUndefined();
    });

    it('returns the serializer after registration', () => {
      const { registerWidgetValueSerializer, getWidgetValueSerializer } = require('../registry');

      const serializer = { serialize: jest.fn(), deserialize: jest.fn() };
      registerWidgetValueSerializer('custom', serializer);

      expect(getWidgetValueSerializer('custom')).toBe(serializer);
    });

    it('overwrites the previous serializer when registering under the same name', () => {
      const { registerWidgetValueSerializer, getWidgetValueSerializer } = require('../registry');

      const first = { serialize: jest.fn(), deserialize: jest.fn() };
      const second = { serialize: jest.fn(), deserialize: jest.fn() };
      registerWidgetValueSerializer('custom', first);
      registerWidgetValueSerializer('custom', second);

      expect(getWidgetValueSerializer('custom')).toBe(second);
    });

    it('serializers for different widget names do not interfere', () => {
      const { registerWidgetValueSerializer, getWidgetValueSerializer } = require('../registry');

      const serializerA = { serialize: jest.fn(), deserialize: jest.fn() };
      const serializerB = { serialize: jest.fn(), deserialize: jest.fn() };
      registerWidgetValueSerializer('widgetA', serializerA);
      registerWidgetValueSerializer('widgetB', serializerB);

      expect(getWidgetValueSerializer('widgetA')).toBe(serializerA);
      expect(getWidgetValueSerializer('widgetB')).toBe(serializerB);
    });
  });

  describe('registerPreviewStyle / getPreviewStyles', () => {
    it('returns empty array before any styles are registered', () => {
      const { getPreviewStyles } = require('../registry');

      expect(getPreviewStyles()).toEqual([]);
    });

    it('registers a string URL style', () => {
      const { registerPreviewStyle, getPreviewStyles } = require('../registry');

      registerPreviewStyle('/styles/preview.css');

      expect(getPreviewStyles()).toEqual([{ value: '/styles/preview.css' }]);
    });

    it('registers a raw CSS string style with raw option', () => {
      const { registerPreviewStyle, getPreviewStyles } = require('../registry');

      registerPreviewStyle('body { color: red; }', { raw: true });

      expect(getPreviewStyles()).toEqual([{ raw: true, value: 'body { color: red; }' }]);
    });

    it('registers multiple styles and returns all of them', () => {
      const { registerPreviewStyle, getPreviewStyles } = require('../registry');

      registerPreviewStyle('/a.css');
      registerPreviewStyle('/b.css');

      const styles = getPreviewStyles();
      expect(styles).toHaveLength(2);
      expect(styles.map(s => s.value)).toEqual(['/a.css', '/b.css']);
    });
  });
});
