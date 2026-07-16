import { oneLine } from '@/lib/util/index';
import {
  registerBlock as registerRichtextBlock,
  registerFormat as registerRichtextFormatPack,
  unregisterBlock as unregisterRichtextBlock,
} from '@/lib/richtext';

import type { Pluggable } from 'unified';
import type { BlockDefinition, BlockPreviewProps, FormatPack } from '@/lib/richtext';
import type { ComponentType } from 'react';
import type {
  CmsWidgetParam,
  CmsMediaLibrary,
  CmsMediaLibraryOptions,
  CmsLocalePhrases,
  CmsWidgetValueSerializer,
  CmsFormatterFunctions,
  CmsAllowedEvent,
  CmsFormatter,
  CmsConfig,
  CmsImplementation,
} from '@/lib/util/index';

type CmsPreviewStyle = { raw?: boolean; value: string };

interface EventHandler {
  handler: Function;
  options: Record<string, unknown>;
}

interface CmsRegistryBackend {
  init: (config: CmsConfig, opts?: Record<string, unknown>) => CmsImplementation;
}

interface CmsWidget {
  control: unknown;
  preview?: unknown;
  globalStyles?: unknown;
  schema?: unknown;
  allowMapValue?: boolean;
  [key: string]: unknown;
}

interface Registry {
  backends: Record<string, CmsRegistryBackend>;
  templates: Record<string, React.ComponentType<unknown>>;
  previewStyles: CmsPreviewStyle[];
  widgets: Record<string, CmsWidget>;
  remarkPlugins: unknown[];
  widgetValueSerializers: Record<string, CmsWidgetValueSerializer>;
  mediaLibraries: (CmsMediaLibrary & { options?: CmsMediaLibraryOptions })[];
  locales: Record<string, CmsLocalePhrases>;
  eventHandlers: Record<CmsAllowedEvent, EventHandler[]>;
  formats: Record<string, CmsFormatter>;
}

// Exported so `src/core/README.md`'s documented event list can be pinned
// against this source of truth in tests (see `registry.spec.ts`).
export const allowedEvents: CmsAllowedEvent[] = [
  'prePublish',
  'postPublish',
  'preUnpublish',
  'postUnpublish',
  'preSave',
  'postSave',
];

const eventHandlers: Record<CmsAllowedEvent, EventHandler[]> = {
  prePublish: [],
  postPublish: [],
  preUnpublish: [],
  postUnpublish: [],
  preSave: [],
  postSave: [],
};

/**
 * Global Registry Object
 */
const registry: Registry = {
  backends: {},
  templates: {},
  previewStyles: [],
  widgets: {},
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
  registerBlock,
  unregisterBlock,
  registerRichtextFormat,
  registerBlockComponents,
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
export function registerWidget(options: WidgetRegistrationOptions<any>) {
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
  if (preview && typeof preview !== 'function' && typeof preview !== 'object') {
    console.warn(oneLine`
      Widget "${widgetName}" registered with an invalid \`previewComponent\` (received
      ${typeof preview}). The \`previewComponent\` should be a React component. The preview
      for this widget will not be rendered.
    `);
  }
  registry.widgets[widgetName] = {
    control,
    preview:
      preview && typeof preview !== 'function' && typeof preview !== 'object' ? undefined : preview,
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
let warnedDeprecatedMarkdownWidget = false;
export function resolveWidget(name: string | undefined) {
  if (name === 'markdown' && !warnedDeprecatedMarkdownWidget) {
    warnedDeprecatedMarkdownWidget = true;
    console.warn(oneLine`
      \`widget: markdown\` is deprecated and registered only as a back-compat alias for
      \`richtext\` (DCMS-483). Update your config to \`widget: richtext\`. See
      BREAKING_CHANGES_V2_BETA.md.
    `);
  }
  return getWidget(name || 'string') || getWidget('unknown');
}

/**
 * Richtext custom blocks and format packs (PT-native replacement for the
 * removed `registerEditorComponent` API; see BREAKING_CHANGES_V2_BETA.md).
 * Register at boot, before entries load.
 */
export function registerBlock<TData extends Record<string, unknown>>(
  definition: BlockDefinition<TData>,
) {
  registerRichtextBlock(definition);
}
export function unregisterBlock(id: string) {
  unregisterRichtextBlock(id);
}
export function registerRichtextFormat(pack: FormatPack) {
  registerRichtextFormatPack(pack);
}

let warnedBlockComponentsReserved = false;
/**
 * Reserved: site-supplied React components rendered for blocks in place of
 * their previews ("blocks are components"). Lands with the visual editor;
 * calling it today has no effect.
 */
export function registerBlockComponents(
  components: Record<string, ComponentType<BlockPreviewProps>>,
) {
  void components;
  if (!warnedBlockComponentsReserved) {
    warnedBlockComponentsReserved = true;
    console.warn(oneLine`
      CMS.registerBlockComponents is reserved for the upcoming visual editor and has no
      effect yet. Use the \`preview\` property of a registered block instead.
    `);
  }
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
export function registerWidgetValueSerializer(
  widgetName: string,
  serializer: CmsWidgetValueSerializer,
) {
  registry.widgetValueSerializers[widgetName] = serializer;
}
export function getWidgetValueSerializer(widgetName: string) {
  return registry.widgetValueSerializers[widgetName];
}

/**
 * Backend API
 */

export function registerBackend(
  name: string,
  BackendClass: new (config: CmsConfig, opts?: Record<string, unknown>) => CmsImplementation,
) {
  if (!name || !BackendClass) {
    console.error(
      "Backend parameters invalid. example: CMS.registerBackend('myBackend', BackendClass)",
    );
  } else if (registry.backends[name]) {
    console.error(`Backend [${name}] already registered. Please choose a different name.`);
  } else {
    registry.backends[name] = {
      init: (config: CmsConfig, opts: Record<string, unknown> = {}) =>
        new BackendClass(config, opts),
    };
  }
}

export function getBackend(name: string) {
  return registry.backends[name];
}

/**
 * Media Libraries
 */
export function registerMediaLibrary(
  mediaLibrary: CmsMediaLibrary,
  options?: CmsMediaLibraryOptions,
) {
  if (registry.mediaLibraries.find(ml => mediaLibrary.name === ml.name)) {
    throw new Error(`A media library named ${mediaLibrary.name} has already been registered.`);
  }
  registry.mediaLibraries.push({ ...mediaLibrary, options });
}

export function getMediaLibrary(name: string) {
  return registry.mediaLibraries.find(ml => ml.name === name);
}

function validateEventName(name: string): asserts name is CmsAllowedEvent {
  if (!allowedEvents.includes(name as CmsAllowedEvent)) {
    throw new Error(`Invalid event name '${name}'`);
  }
}

export function getEventListeners(name: string) {
  validateEventName(name);
  return [...registry.eventHandlers[name]];
}

interface EventListenerConfig {
  name: CmsAllowedEvent;
  handler: Function;
}

export function registerEventListener(
  { name, handler }: EventListenerConfig,
  options: Record<string, unknown> = {},
) {
  validateEventName(name);
  registry.eventHandlers[name].push({ handler, options });
}

interface EventData {
  entry: any;

  [key: string]: any;
}

export async function invokeEvent({ name, data }: { name: string; data: EventData }) {
  validateEventName(name);
  const handlers = registry.eventHandlers[name];

  let _data = { ...data };
  for (const { handler, options } of handlers) {
    const result = await handler(_data, options);
    if (result !== undefined) {
      const entry = { ..._data.entry, data: result };
      _data = { ...data, entry };
    }
  }
  return _data.entry;
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

export function registerCustomFormat(
  name: string,
  extension: string,
  formatter: CmsFormatterFunctions,
) {
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

export function getCustomFormatsFormatters(): Record<string, CmsFormatterFunctions> {
  return Object.entries(registry.formats).reduce(function (acc, [name, { formatter }]) {
    return { ...acc, [name]: formatter };
  }, {});
}

export function getFormatter(name: string) {
  return registry.formats[name]?.formatter;
}
