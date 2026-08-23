import { merge } from 'lodash-es';

import { oneLine } from '@/lib/util/index';

import type { CmsSlots, EditorPanel } from '@/core/lib/slots';
import type { BackendClass } from '@/lib/backend/index';
import type {
  CmsAllowedEvent,
  CmsConfig,
  CmsEntryCodec,
  CmsEventName,
  CmsFormatter,
  CmsFormatterFunctions,
  CmsLocaleAction,
  CmsLocalePhrases,
  CmsMediaLibrary,
  CmsMediaLibraryOptions,
  CmsNotificationEvent,
  CmsNotificationEventData,
  CmsRegistryBackend,
  CmsWidgetParam,
  CmsWidgetValueSerializer,
  LlmTransport,
} from '@/lib/util/index';
import type { Pluggable } from 'unified';

type CmsPreviewStyle = { raw?: boolean, value: string };

interface EventHandler {
  handler: Function;
  options: Record<string, unknown>;
}

// Registry entries are stored as-provided, so an explicitly-passed `undefined`
// is a value the registry holds rather than an absent key.
interface CmsWidget {
  control: unknown;
  preview?: unknown;
  globalStyles?: unknown;
  schema?: unknown;
  allowMapValue?: boolean | undefined;
  [key: string]: unknown;
}

interface Registry {
  backends: Record<string, CmsRegistryBackend>;
  templates: Record<string, React.ComponentType<unknown>>;
  previewStyles: CmsPreviewStyle[];
  widgets: Record<string, CmsWidget>;
  remarkPlugins: unknown[];
  widgetValueSerializers: Record<string, CmsWidgetValueSerializer>;
  mediaLibraries: (CmsMediaLibrary & { options?: CmsMediaLibraryOptions | undefined })[];
  locales: Record<string, CmsLocalePhrases>;
  localeActions: CmsLocaleAction[];
  slots: Partial<CmsSlots>;
  llmTransport: LlmTransport | undefined;
  eventHandlers: Record<CmsEventName, EventHandler[]>;
  formats: Record<string, CmsFormatter>;
  entryCodecs: CmsEntryCodec[];
}

// Exported so `src/core/README.md`'s documented event lists can be pinned
// against this source of truth in tests (see `registry.spec.ts`).

/** Transform events: fired around a `Backend` operation, handlers may rewrite entry data. */
export const allowedEvents: CmsAllowedEvent[] = [
  'prePublish',
  'postPublish',
  'preUnpublish',
  'postUnpublish',
  'preSave',
  'postSave',
];

/** Notification events: fired from the store, handler return values ignored. */
export const notificationEvents: CmsNotificationEvent[] = [
  'entryDraftOpen',
  'entryDraftChange',
  'entryDraftDiscard',
  'postDelete',
];

const eventHandlers: Record<CmsEventName, EventHandler[]> = {
  prePublish: [],
  postPublish: [],
  preUnpublish: [],
  postUnpublish: [],
  preSave: [],
  postSave: [],
  entryDraftOpen: [],
  entryDraftChange: [],
  entryDraftDiscard: [],
  postDelete: [],
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
  localeActions: [],
  slots: {},
  llmTransport: undefined,
  eventHandlers,
  formats: {},
  entryCodecs: [],
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
  registerLocaleAction,
  getLocaleActions,
  unregisterLocaleAction,
  registerSlot,
  getSlots,
  unregisterSlot,
  registerPanel,
  getPanels,
  unregisterPanel,
  registerLlmTransport,
  getLlmTransport,
  unregisterLlmTransport,
  registerEventListener,
  removeEventListener,
  getEventListeners,
  invokeEvent,
  invokeNotificationEvent,
  registerCustomFormat,
  getCustomFormats,
  getCustomFormatsExtensions,
  getCustomFormatsFormatters,
  registerEntryCodec,
  getEntryCodecs,
  getEntryCodec,
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
    preview: preview && typeof preview !== 'function' && typeof preview !== 'object' ? undefined : preview,
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
      breaking-changes-v4-beta.md.
    `);
  }
  return getWidget(name || 'string') || getWidget('unknown');
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

export function registerBackend(name: string, BackendClass: BackendClass) {
  if (!name || !BackendClass) {
    console.error(
      "Backend parameters invalid. example: CMS.registerBackend('myBackend', BackendClass)",
    );
  } else if (registry.backends[name]) {
    console.error(`Backend [${name}] already registered. Please choose a different name.`);
  } else {
    registry.backends[name] = {
      init: (config: CmsConfig, opts: Record<string, unknown> = {}) => new BackendClass(config, opts),
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

function validateEventName(name: string): asserts name is CmsEventName {
  if (
    !allowedEvents.includes(name as CmsAllowedEvent)
    && !notificationEvents.includes(name as CmsNotificationEvent)
  ) {
    throw new Error(`Invalid event name '${name}'`);
  }
}

function validateTransformEventName(name: string): asserts name is CmsAllowedEvent {
  if (notificationEvents.includes(name as CmsNotificationEvent)) {
    throw new Error(`'${name}' is a notification event; fire it with invokeNotificationEvent`);
  }
  validateEventName(name);
}

function validateNotificationEventName(name: string): asserts name is CmsNotificationEvent {
  if (allowedEvents.includes(name as CmsAllowedEvent)) {
    throw new Error(`'${name}' is a transform event; fire it with invokeEvent`);
  }
  validateEventName(name);
}

export function getEventListeners(name: string) {
  validateEventName(name);
  return [...registry.eventHandlers[name]];
}

interface EventListenerConfig {
  name: CmsEventName;
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

export async function invokeEvent({ name, data }: { name: string, data: EventData }) {
  validateTransformEventName(name);
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

/**
 * Fires a notification event. Unlike `invokeEvent` these are observational:
 * handlers cannot rewrite anything, so return values are ignored and a
 * throwing handler is logged rather than propagated — a broken extension must
 * not break editing. Handlers are called synchronously in registration order;
 * a promise-returning handler is not awaited.
 */
export function invokeNotificationEvent<K extends CmsNotificationEvent>(
  name: K,
  data: CmsNotificationEventData[K],
) {
  validateNotificationEventName(name);
  for (const { handler, options } of registry.eventHandlers[name]) {
    try {
      const result = handler(data, options);
      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          console.error(`Error in '${name}' event handler`, error);
        });
      }
    } catch (error) {
      console.error(`Error in '${name}' event handler`, error);
    }
  }
}

export function removeEventListener({ name, handler }: { name: string, handler?: Function }) {
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

/**
 * Registers phrases for a locale, merging into whatever is already registered
 * for it. Merging (rather than replacing) is what lets an extension package
 * contribute its own strings — `registerLocale('en', { ... })` from an
 * extension would otherwise wipe the CMS's own English phrases. `getPhrases`
 * already merges the `en` fallback with the requested locale on read, so this
 * aligns the write side with it.
 */
export function registerLocale(locale: string, phrases: CmsLocalePhrases) {
  if (!locale || !phrases) {
    console.error("Locale parameters invalid. example: CMS.registerLocale('locale', phrases)");
  } else {
    registry.locales[locale] = merge({}, registry.locales[locale], phrases);
  }
}

export function getLocale(locale: string) {
  return registry.locales[locale];
}

/**
 * Locale actions
 *
 * Actions rendered in the editor's locale row, alongside the built-in locale
 * dropdowns. The seam exists so feature-specific editor actions (AI
 * translation, glossary lookup, translation-memory prefill) live in their own
 * packages: the editor resolves the i18n context and hands it to the action,
 * which owns its UI, its dependencies and its phrases.
 */
export function registerLocaleAction(action: CmsLocaleAction) {
  if (!action?.name || typeof action.render !== 'function') {
    throw new Error(
      'Locale action parameters invalid. example: CMS.registerLocaleAction({ name, render })',
    );
  }
  if (registry.localeActions.some(existing => existing.name === action.name)) {
    throw new Error(`A locale action named ${action.name} has already been registered.`);
  }
  registry.localeActions.push(action);
}

export function getLocaleActions() {
  return [...registry.localeActions];
}

/** Removes a registered locale action. No-op when the name is unknown. */
export function unregisterLocaleAction(name: string) {
  registry.localeActions = registry.localeActions.filter(action => action.name !== name);
}

/**
 * Render slots
 *
 * `CmsSlots` was originally suppliable only by the host app, through
 * `CmsSlotsProvider` at the `AppContent` boundary. That made it impossible for
 * an installable package to contribute UI: the app author had to thread every
 * slot manually. Registering a slot here is the package-side equivalent.
 *
 * App-supplied slots win over registered ones: the deployment has the final
 * say over anything a dependency provides.
 */
export function registerSlot<K extends keyof CmsSlots>(name: K, render: NonNullable<CmsSlots[K]>) {
  if (!name || typeof render !== 'function') {
    throw new Error(
      "Slot parameters invalid. example: CMS.registerSlot('renderEntryCard', props => ...)",
    );
  }
  if (registry.slots[name]) {
    console.warn(oneLine`
      Multiple renderers registered for slot "${name}". Only the last one registered will be
      used. App-supplied slots (CmsSlotsProvider) still take precedence over both.
    `);
  }
  registry.slots[name] = render;
}

export function getSlots(): Partial<CmsSlots> {
  return { ...registry.slots };
}

/** Removes a registered slot renderer. No-op when the slot is unset. */
export function unregisterSlot(name: keyof CmsSlots) {
  delete registry.slots[name];
}

/**
 * Editor panels
 *
 * Additive, unlike the render slots above: registering a second panel adds a
 * tab rather than replacing the first. Panels supplied by the app through
 * `CmsSlotsProvider` are rendered before registered ones.
 */
export function registerPanel(panel: EditorPanel) {
  if (!panel?.id || typeof panel.render !== 'function') {
    throw new Error(
      'Panel parameters invalid. example: CMS.registerPanel({ id, label, render: props => ... })',
    );
  }
  const panels = registry.slots.editorPanels ?? [];
  if (panels.some(existing => existing.id === panel.id)) {
    throw new Error(`A panel with id ${panel.id} has already been registered.`);
  }
  registry.slots.editorPanels = [...panels, panel];
}

export function getPanels(): EditorPanel[] {
  return [...(registry.slots.editorPanels ?? [])];
}

/** Removes a registered panel by id. No-op when it is not registered. */
export function unregisterPanel(id: string) {
  registry.slots.editorPanels = (registry.slots.editorPanels ?? []).filter(panel => panel.id !== id);
}

/**
 * LLM transport
 *
 * The CMS ships AI *UI* (a chat panel, a translate action) and no transport;
 * `LlmTransport` is the seam a host fills in. Prefer the `llm` prop on
 * `DecapCmsProvider` — this registration exists for the case props cannot
 * reach, i.e. injecting a transport into an already-compiled bundle. The prop
 * wins when both are present (`useLlmTransport`).
 */
export function registerLlmTransport(transport: LlmTransport) {
  if (typeof transport?.openSession !== 'function') {
    throw new Error(
      'LLM transport invalid. example: CMS.registerLlmTransport({ openSession: document => session })',
    );
  }
  if (registry.llmTransport) {
    console.warn(oneLine`
      An LLM transport was already registered; the last registration wins. A transport passed to
      DecapCmsProvider's \`llm\` prop takes precedence over both.
    `);
  }
  registry.llmTransport = transport;
}

export function getLlmTransport(): LlmTransport | undefined {
  return registry.llmTransport;
}

/** Removes the registered transport. No-op when none is registered. */
export function unregisterLlmTransport() {
  registry.llmTransport = undefined;
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
  return Object.entries(registry.formats).reduce(function(acc, [name, { extension }]) {
    return { ...acc, [name]: extension };
  }, {});
}

export function getCustomFormatsFormatters(): Record<string, CmsFormatterFunctions> {
  return Object.entries(registry.formats).reduce(function(acc, [name, { formatter }]) {
    return { ...acc, [name]: formatter };
  }, {});
}

export function getFormatter(name: string) {
  return registry.formats[name]?.formatter;
}

/**
 * Entry codecs (yaml/toml/json, `src/entry-codecs/*`): whole-entry-file
 * encodings. Nothing is registered by default; the fat app entry points
 * register all three, `/bare` consumers register only what their collections
 * use. Registration order matters: the inferring `frontmatter` format tries
 * fence languages in this order.
 */
export function registerEntryCodec(pack: CmsEntryCodec) {
  if (!pack || !pack.name || !pack.formatter) {
    console.error(
      "Entry format parameters invalid. example: CMS.registerEntryCodec({ name: 'yaml', fileExtensions: ['yml'], defaultExtension: 'yml', formatter })",
    );
    return;
  }
  const existing = registry.entryCodecs.findIndex(p => p.name === pack.name);
  if (existing !== -1) {
    registry.entryCodecs.splice(existing, 1, pack);
  } else {
    registry.entryCodecs.push(pack);
  }
}

/** Registered entry-format packs, in registration order. */
export function getEntryCodecs(): CmsEntryCodec[] {
  return registry.entryCodecs;
}

/** Look up an entry-format pack by canonical name or alias. */
export function getEntryCodec(name: string): CmsEntryCodec | undefined {
  return registry.entryCodecs.find(p => p.name === name || p.aliases?.includes(name));
}
