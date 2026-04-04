import { Map } from 'immutable';
import { oneLine } from 'common-tags';
import type { Pluggable } from 'unified';

import EditorComponent from '../valueObjects/EditorComponent';
import type {
  CmsRegistry,
  CmsWidgetParam,
  CmsMediaLibrary,
  CmsMediaLibraryOptions,
  CmsLocalePhrases,
  CmsWidgetValueSerializer,
  CmsBackendClass,
  EditorComponentOptions,
  EditorComponentPlugin,
  FormatterFunctions,
  AllowedEvent,
  EventHandler,
} from '../types/cms';

const allowedEvents: AllowedEvent[] = [
  'prePublish',
  'postPublish',
  'preUnpublish',
  'postUnpublish',
  'preSave',
  'postSave',
];

const eventHandlers: Record<AllowedEvent, EventHandler[]> = {
  'prePublish': [],
  'postPublish': [],
  'preUnpublish': [],
  'postUnpublish': [],
  'preSave': [],
  'postSave': [],
};

/**
 * Global Registry Object
 */
const registry: CmsRegistry = {
  backends: {},
  templates: {},
  previewStyles: [],
  widgets: {},
  editorComponents: Map<string, EditorComponentPlugin>(),
  remarkPlugins: [],
  widgetValueSerializers: {},
  mediaLibraries: [],
  locales: {},
  eventHandlers,
  formats: {},
};

export default {
  registerPreviewStyle,
  getPreviewStyles,
  registerPreviewTemplate,
  getPreviewTemplate,
  registerWidget,
  getWidget,
  getWidgets,
  resolveWidget,
  registerEditorComponent,
  getEditorComponents,
  registerRemarkPlugin,
  getRemarkPlugins,
  registerWidgetValueSerializer,
  getWidgetValueSerializer,
  registerBackend,
  getBackend,
  registerMediaLibrary,
  getMediaLibrary,
  registerLocale,
  getLocale,
  registerEventListener,
  removeEventListener,
  getEventListeners,
  invokeEvent,
  registerCustomFormat,
  getCustomFormats,
  getCustomFormatsExtensions,
  getCustomFormatsFormatters,
};

/**
 * Preview Styles
 *
 * Valid options:
 *  - raw {boolean} if `true`, `style` value is expected to be a CSS string
 */
export function registerPreviewStyle(style: string, opts: { raw: boolean }) {
  registry.previewStyles.push({ ...opts, value: style });
}
export function getPreviewStyles() {
  return registry.previewStyles;
}

/**
 * Preview Templates
 */
export function registerPreviewTemplate(name: string, component: React.ComponentType<unknown>) {
  registry.templates[name] = component;
}
export function getPreviewTemplate(name: string) {
  return registry.templates[name];
}

interface WidgetRegistrationOptions<T = unknown> extends CmsWidgetParam<T> {
  schema?: unknown;
  allowMapValue?: boolean;
  [key: string]: unknown;
}

/**
 * Editor Widgets
 */
export function registerWidget(options: WidgetRegistrationOptions) {
  const {
    name: widgetName,
    controlComponent: control,
    previewComponent: preview,
    schema = {},
    allowMapValue,
    globalStyles,
  } = options;
  if (registry.widgets[widgetName]) {
    console.warn(oneLine`
      Multiple widgets registered with name "${widgetName}". Only the last widget registered with
      this name will be used.
    `);
  }
  if (!control) {
    throw Error(`Widget "${widgetName}" registered without \`controlComponent\`.`);
  }
  registry.widgets[widgetName] = {
    control,
    preview,
    schema,
    globalStyles,
    allowMapValue,
    ...options,
  };
}
export function getWidget(name: string) {
  return registry.widgets[name];
}
export function getWidgets() {
  return Object.entries(registry.widgets).map(([key, value]) => ({ name: key, ...value }));
}
export function resolveWidget(name: string | undefined) {
  return getWidget(name || 'string') || getWidget('unknown');
}

/**
 * Markdown Editor Custom Components
 */
export function registerEditorComponent(component: EditorComponentOptions) {
  const plugin = EditorComponent(component) as EditorComponentPlugin;
  if (plugin.type === 'code-block') {
    const codeBlock = registry.editorComponents.find((c: EditorComponentPlugin) => c.type === 'code-block');

    if (codeBlock) {
      console.warn(oneLine`
        Only one editor component of type "code-block" may be registered. Previously registered code
        block component(s) will be overwritten.
      `);
      registry.editorComponents = registry.editorComponents.delete(codeBlock.id);
    }
  }

  registry.editorComponents = registry.editorComponents.set(plugin.id, plugin);
}
export function getEditorComponents() {
  return registry.editorComponents;
}

/**
 * Remark plugins
 */
export function registerRemarkPlugin(plugin: Pluggable) {
  registry.remarkPlugins.push(plugin);
}
export function getRemarkPlugins(): Pluggable[] {
  return registry.remarkPlugins as Pluggable[];
}

/**
 * Widget Serializers
 */
export function registerWidgetValueSerializer(widgetName: string, serializer: CmsWidgetValueSerializer) {
  registry.widgetValueSerializers[widgetName] = serializer;
}
export function getWidgetValueSerializer(widgetName: string) {
  return registry.widgetValueSerializers[widgetName];
}

/**
 * Backend API
 */
export function registerBackend(name: string, BackendClass: CmsBackendClass) {
  if (!name || !BackendClass) {
    console.error(
      "Backend parameters invalid. example: CMS.registerBackend('myBackend', BackendClass)",
    );
  } else if (registry.backends[name]) {
    console.error(`Backend [${name}] already registered. Please choose a different name.`);
  } else {
    registry.backends[name] = {
      init: (...args: unknown[]) => new BackendClass(...args),
    };
  }
}

export function getBackend(name: string) {
  return registry.backends[name];
}

/**
 * Media Libraries
 */
export function registerMediaLibrary(mediaLibrary: CmsMediaLibrary, options?: CmsMediaLibraryOptions) {
  if (registry.mediaLibraries.find(ml => mediaLibrary.name === ml.name)) {
    throw new Error(`A media library named ${mediaLibrary.name} has already been registered.`);
  }
  registry.mediaLibraries.push({ ...mediaLibrary, options });
}

export function getMediaLibrary(name: string) {
  return registry.mediaLibraries.find(ml => ml.name === name);
}

function validateEventName(name: string): asserts name is AllowedEvent {
  if (!allowedEvents.includes(name as AllowedEvent)) {
    throw new Error(`Invalid event name '${name}'`);
  }
}

export function getEventListeners(name: string) {
  validateEventName(name);
  return [...registry.eventHandlers[name]];
}

interface EventListenerConfig {
  name: AllowedEvent;
  handler: Function;
}

export function registerEventListener({ name, handler }: EventListenerConfig, options: Record<string, unknown> = {}) {
  validateEventName(name);
  registry.eventHandlers[name].push({ handler, options });
}

interface EventData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export async function invokeEvent({ name, data }: { name: string; data: EventData }) {
  validateEventName(name);
  const handlers = registry.eventHandlers[name];

  let _data = { ...data };
  for (const { handler, options } of handlers) {
    const result = await handler(_data, options);
    if (result !== undefined) {
      const entry = _data.entry.set('data', result);
      _data = { ...data, entry };
    }
  }
  return _data.entry.get('data');
}

export function removeEventListener({ name, handler }: { name: string; handler?: Function }) {
  validateEventName(name);
  if (handler) {
    registry.eventHandlers[name] = registry.eventHandlers[name].filter(
      (item: EventHandler) => item.handler !== handler,
    );
  } else {
    registry.eventHandlers[name] = [];
  }
}

/**
 * Locales
 */
export function registerLocale(locale: string, phrases: CmsLocalePhrases) {
  if (!locale || !phrases) {
    console.error("Locale parameters invalid. example: CMS.registerLocale('locale', phrases)");
  } else {
    registry.locales[locale] = phrases;
  }
}

export function getLocale(locale: string) {
  return registry.locales[locale];
}

export function registerCustomFormat(name: string, extension: string, formatter: FormatterFunctions) {
  registry.formats[name] = { extension, formatter };
}

export function getCustomFormats() {
  return registry.formats;
}

export function getCustomFormatsExtensions(): Record<string, string> {
  return Object.entries(registry.formats).reduce(function (acc, [name, { extension }]) {
    return { ...acc, [name]: extension };
  }, {});
}

export function getCustomFormatsFormatters(): Record<string, FormatterFunctions> {
  return Object.entries(registry.formats).reduce(function (acc, [name, { formatter }]) {
    return { ...acc, [name]: formatter };
  }, {});
}

export function getFormatter(name: string) {
  return registry.formats[name]?.formatter;
}
