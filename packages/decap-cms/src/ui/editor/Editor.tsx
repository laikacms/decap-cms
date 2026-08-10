import { CodeHighlightNode, CodeNode } from '@lexical/code';
import {
  ClearEditorExtension,
  DecoratorTextExtension,
  HorizontalRuleExtension,
  SelectionAlwaysOnDisplayExtension,
} from '@lexical/extension';
import { HashtagExtension } from '@lexical/hashtag';
import { HistoryExtension } from '@lexical/history';
import { AutoLinkExtension, ClickableLinkExtension, LinkExtension } from '@lexical/link';
import { CheckListExtension, ListExtension } from '@lexical/list';
import {
  CHECK_LIST,
  CODE,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown';
import { OverflowNode } from '@lexical/overflow';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { RichTextExtension } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import {
  $getRoot,
  $parseSerializedNode,
  configExtension,
  defineExtension,
  type EditorState,
  HISTORY_MERGE_TAG,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from 'lexical';
import { useCallback, useMemo, useRef, useState } from 'react';

import { type BlocksConfig, type FormatLexicalExtras } from '@/lib/richtext';
import {
  BLOCK_HISTORY_MERGE_TAG,
  BlockNode,
  BlocksProvider,
  InlineBlockNode,
  sourceToEditorState,
} from '@/lib/richtext/lexical';
import { Separator } from '@/ui/Separator';
import { TooltipProvider } from '@/ui/Tooltip';
import { useBlockViewer } from './_block-viewer-stub';
import { BlockChrome } from './editor-ui/BlockChrome';
import { ContentEditable } from './editor-ui/ContentEditable';
import { ScrollableToolbar } from './editor-ui/ScrollableToolbar';
import { DateTimeExtension } from './extensions/DateTimeExtension';
import { DragDropPasteExtension } from './extensions/DragDropPasteExtension';
import { EmojisExtension } from './extensions/EmojisExtension';
import { ImagesExtension } from './extensions/ImagesExtension';
import { KeywordsExtension } from './extensions/KeywordsExtension';
import { MarkdownShortcutsExtension } from './extensions/MarkdownShortcutsExtension';
import { MaxLengthExtension } from './extensions/MaxLengthExtension';
import { EmojiNode } from './nodes/EmojiNode';
import { LayoutContainerNode } from './nodes/LayoutContainerNode';
import { LayoutItemNode } from './nodes/LayoutItemNode';
import { MentionNode } from './nodes/mention-node';
import { SpecialTextNode } from './nodes/SpecialTextNode';
import { ActionsPlugin } from './plugins/actions/ActionsPlugin';
import { ClearEditorActionPlugin } from './plugins/actions/ClearEditorPlugin';
import { CounterCharacterPlugin } from './plugins/actions/CounterCharacterPlugin';
import { EditModeTogglePlugin } from './plugins/actions/EditModeTogglePlugin';
import { ImportExportPlugin } from './plugins/actions/ImportExportPlugin';
import { ShareContentPlugin } from './plugins/actions/ShareContentPlugin';
import { SourceTogglePlugin } from './plugins/actions/SourceTogglePlugin';
import { SpeechToTextPlugin } from './plugins/actions/SpeechToTextPlugin';
import { TreeViewPlugin } from './plugins/actions/TreeViewPlugin';
import { CodeActionMenuPlugin } from './plugins/CodeActionMenuPlugin';
import { CodeHighlightPlugin } from './plugins/CodeHighlightPlugin';
import { ComponentPickerMenuPlugin } from './plugins/ComponentPickerMenuPlugin';
import { ContextMenuPlugin } from './plugins/ContextMenuPlugin';
import { DraggableBlockPlugin } from './plugins/DraggableBlockPlugin';
import { EmojiPickerPlugin } from './plugins/EmojiPickerPlugin';
import { FloatingLinkEditorPlugin } from './plugins/FloatingLinkEditorPlugin';
import { FloatingTextFormatToolbarPlugin } from './plugins/FloatingTextFormatPlugin';
import { LayoutPlugin } from './plugins/LayoutPlugin';
import { MentionsPlugin } from './plugins/MentionsPlugin';
import { buildBasePickerOptions } from './plugins/picker/basePickerOptions';
import { adaptInsertOption, blockPickerOptions } from './plugins/picker/BlockPickerPlugin';
import { DynamicTablePickerPlugin } from './plugins/picker/TablePickerPlugin';
import { SpecialTextPlugin } from './plugins/SpecialTextPlugin';
import { TabFocusPlugin } from './plugins/TabFocusPlugin';
import { FormatBulletedList } from './plugins/toolbar/block-format/FormatBulletedList';
import { FormatCheckList } from './plugins/toolbar/block-format/FormatCheckList';
import { FormatCodeBlock } from './plugins/toolbar/block-format/FormatCodeBlock';
import { FormatHeading } from './plugins/toolbar/block-format/FormatHeading';
import { FormatNumberedList } from './plugins/toolbar/block-format/FormatNumberedList';
import { FormatParagraph } from './plugins/toolbar/block-format/FormatParagraph';
import { FormatQuote } from './plugins/toolbar/block-format/FormatQuote';
import { InsertBlock } from './plugins/toolbar/block-insert/InsertBlock';
import { InsertHorizontalRule } from './plugins/toolbar/block-insert/InsertHorizontalRule';
import { InsertImage } from './plugins/toolbar/block-insert/InsertImage';
import { InsertTable } from './plugins/toolbar/block-insert/InsertTable';
import { BlockFormatDropDown } from './plugins/toolbar/BlockFormatToolbarPlugin';
import { BlockInsertPlugin } from './plugins/toolbar/BlockInsertPlugin';
import { ClearFormattingToolbarPlugin } from './plugins/toolbar/ClearFormattingToolbarPlugin';
import { CodeLanguageToolbarPlugin } from './plugins/toolbar/CodeLanguageToolbarPlugin';
import { ElementFormatToolbarPlugin } from './plugins/toolbar/ElementFormatToolbarPlugin';
import { FontBackgroundToolbarPlugin } from './plugins/toolbar/FontBackgroundToolbarPlugin';
import { FontColorToolbarPlugin } from './plugins/toolbar/FontColorToolbarPlugin';
import { FontFamilyToolbarPlugin } from './plugins/toolbar/FontFamilyToolbarPlugin';
import { FontFormatToolbarPlugin } from './plugins/toolbar/FontFormatToolbarPlugin';
import { FontSizeToolbarPlugin } from './plugins/toolbar/FontSizeToolbarPlugin';
import { HistoryToolbarPlugin } from './plugins/toolbar/HistoryToolbarPlugin';
import { LinkToolbarPlugin } from './plugins/toolbar/LinkToolbarPlugin';
import { SubSuperToolbarPlugin } from './plugins/toolbar/SubsuperToolbarPlugin';
import { ToolbarPlugin } from './plugins/toolbar/ToolbarPlugin';
import { editorTheme } from './themes/editor-theme';
import { EMOJI } from './transformers/emoji-transformer';
import { HR } from './transformers/hr-transformer';
import { IMAGE } from './transformers/image-transformer';
import { TABLE } from './transformers/table-transformer';
import { validateUrl } from './utils/url';

const defaultPlaceholder = 'Press / for commands...';
const maxLength = 30;

/**
 * Named editor capabilities, all enabled by default. Evolution is additive:
 * new keys default to enabled, so passing an older object stays valid.
 *
 * Flags gate AUTHORING affordances only (toolbar buttons, slash-menu
 * entries, markdown shortcuts, paste handling) — never node registration.
 * Existing content using a disabled feature still loads and renders; the
 * user just cannot create more of it.
 */
export interface EditorFeatures {
  /** Image insertion: toolbar button, slash-menu entry, drag-drop paste, `![]()` shortcut. */
  images?: boolean;
  /** Table insertion: toolbar button, slash-menu entries (incl. `3x3` dynamic picker), `|…|` shortcut. */
  tables?: boolean;
  /** Code blocks: block-format dropdown, slash-menu entry, ``` shortcut. */
  codeBlocks?: boolean;
  /** Font family/size/color/background toolbar controls. */
  fontStyling?: boolean;
}

/**
 * Overlay feature denials on an item record without copying it (the records
 * are all-true Proxies from `useBlockViewer`; spreading them would yield `{}`).
 */
function gateItems(
  items: Record<string, boolean>,
  denied: ReadonlySet<string>,
): Record<string, boolean> {
  if (denied.size === 0) return items;
  return new Proxy(items, {
    get: (target, key) => (typeof key === 'string' && denied.has(key) ? false : target[key as string]),
  });
}

/** The given keys when `off`, nothing otherwise (denial-set builder). */
function denyIf(off: boolean, ...keys: string[]): string[] {
  return off ? keys : [];
}

export function Editor({
  editorState,
  editorSerializedState,
  format = 'markdown',
  onChange,
  onSerializedChange,
  extensions,
  blocksConfig,
  features,
  placeholder = defaultPlaceholder,
  ariaRequired,
  ariaInvalid,
  ariaErrorMessage,
  ariaLabel,
  ariaDescribedBy,
}: {
  editorState?: EditorState,
  editorSerializedState?: SerializedEditorState | undefined,
  /**
   * Mapper id of the field's storage format (see `lib/richtext` registry).
   * Drives the source-view toggle; the editor itself only speaks Portable
   * Text and never needs format knowledge beyond this id.
   */
  format?: string,
  onChange?: (editorState: EditorState) => void,
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void,
  /**
   * Lexical extras contributed by the field's format pack (custom nodes,
   * markdown-shortcut transformers, slash-menu entries). MUST be
   * referentially stable across renders: node registration happens at
   * composer mount, so a new identity remounts the editor.
   */
  extensions?: FormatLexicalExtras | undefined,
  /**
   * Custom-block context for this instance: the per-field block map plus the
   * inline prop-form renderer injected by the widget layer. The default
   * block chrome is supplied here; `blocksConfig.renderBlockChrome` overrides it.
   */
  blocksConfig?: BlocksConfig,
  /**
   * Named capability toggles (see {@link EditorFeatures}); omitted keys are
   * enabled. Object identity does not matter — only the resolved booleans
   * feed the composer memo, so a fresh-but-equal object never remounts the
   * editor.
   */
  features?: EditorFeatures,
  /** Empty-state placeholder text shown in the editable region. Threaded
   * down from the Decap field's `placeholder` config; falls back to the
   * built-in default when unset. */
  placeholder?: string | undefined,
  /** Threaded down from the Decap widget layer's validation state onto the
   * editable region so screen readers can identify a failed-save required
   * field (WCAG 2.1 3.3.1 / 3.3.3). */
  ariaRequired?: boolean,
  ariaInvalid?: boolean | undefined,
  ariaErrorMessage?: string | undefined,
  /** Accessible name for the editable `role="textbox"` div, since `<label
   * htmlFor>` silently fails to associate with non-labelable elements like
   * `<div>` (WCAG 4.1.2 / DCMS-1275). */
  ariaLabel?: string,
  /** Id of the field's hint text, threaded onto the editable region via
   * `aria-describedby` (DCMS-1298). */
  ariaDescribedBy?: string | undefined,
}) {
  const {
    toolbarItems: rawToolbarItems,
    footerItems,
    pluginItems,
    blockFormatItems: rawBlockFormatItems,
    blockInsertItems: rawBlockInsertItems,
    componentPickerItems: rawComponentPickerItems,
  } = useBlockViewer();

  const withImages = features?.images !== false;
  const withTables = features?.tables !== false;
  const withCodeBlocks = features?.codeBlocks !== false;
  const withFontStyling = features?.fontStyling !== false;

  const toolbarItems = gateItems(
    rawToolbarItems,
    new Set(denyIf(!withFontStyling, 'fontFamily', 'fontSize', 'fontColor', 'fontBackground')),
  );
  const blockFormatItems = gateItems(
    rawBlockFormatItems,
    new Set(denyIf(!withCodeBlocks, 'codeBlock')),
  );
  const blockInsertItems = gateItems(
    rawBlockInsertItems,
    new Set([...denyIf(!withImages, 'image'), ...denyIf(!withTables, 'table')]),
  );
  const componentPickerItems = gateItems(
    rawComponentPickerItems,
    new Set([
      ...denyIf(!withImages, 'image'),
      ...denyIf(!withTables, 'table'),
      ...denyIf(!withCodeBlocks, 'codeBlock'),
    ]),
  );

  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  // Source view: the document is one code node holding the field's source
  // (rich text <-> source via the format's mapper; see SourceTogglePlugin).
  // A ref mirrors the state so the change handler below switches behavior in
  // the same tick as the toggle's document mutation, before React re-renders.
  const [isSourceView, setIsSourceView] = useState(false);
  const isSourceViewRef = useRef(false);
  const handleSourceViewChange = useCallback((on: boolean) => {
    isSourceViewRef.current = on;
    setIsSourceView(on);
  }, []);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  const AppExtension = useMemo(
    () =>
      defineExtension({
        dependencies: [
          RichTextExtension,
          ImagesExtension,
          HorizontalRuleExtension,
          configExtension(ListExtension, { shouldPreserveNumbering: false }),
          CheckListExtension,
          configExtension(MarkdownShortcutsExtension, {
            transformers: [
              // Format-pack transformers first so they can shadow built-ins.
              ...(extensions?.transformers ?? []),
              ...(withTables ? [TABLE] : []),
              HR,
              ...(withImages ? [IMAGE] : []),
              EMOJI,
              CHECK_LIST,
              ...ELEMENT_TRANSFORMERS,
              // The ``` fence transformer follows the codeBlocks feature.
              ...MULTILINE_ELEMENT_TRANSFORMERS.filter(t => withCodeBlocks || t !== CODE),
              ...TEXT_FORMAT_TRANSFORMERS,
              ...TEXT_MATCH_TRANSFORMERS,
            ],
          }),
          // No AutoFocusExtension: the editor is one field in a CMS form, and
          // several instances can mount on one page (sibling richtext fields,
          // nested block forms). Each mount's autofocus would steal focus to
          // that editor's end — observed as "the caret jumps to the end a
          // moment after clicking" and as the page scroll-jacking to the last
          // richtext field when an entry opens.
          ClearEditorExtension,
          DecoratorTextExtension,
          HistoryExtension,
          KeywordsExtension,
          HashtagExtension,
          DateTimeExtension,
          // Playground leftover: with `disabled: false` this silently DELETES
          // everything past `maxLength` (30!) chars, including content merely
          // hydrated or converted by the source toggle. Keep it off until a
          // real per-field character limit is threaded through the config.
          configExtension(MaxLengthExtension, { disabled: true, maxLength }),
          // Drag-drop/paste creates image nodes, so it follows the images feature.
          ...(withImages ? [DragDropPasteExtension] : []),
          EmojisExtension,
          configExtension(LinkExtension, {
            validateUrl,
            attributes: {
              rel: 'noopener noreferrer',
              target: '_blank',
            },
          }),
          AutoLinkExtension,
          ClickableLinkExtension,
          SelectionAlwaysOnDisplayExtension,
        ],
        // html: buildHTMLConfig(),
        name: '@decap-editor',
        namespace: 'Playground',
        nodes: [
          OverflowNode,
          TableNode,
          TableCellNode,
          TableRowNode,
          CodeNode,
          CodeHighlightNode,
          MentionNode,
          EmojiNode,
          LayoutContainerNode,
          LayoutItemNode,
          SpecialTextNode,
          // Generic custom-block node (`decap-block`) emitted by the Portable
          // Text bridge for any content that isn't plain text/code (e.g. an
          // image or shortcode from imported Markdown). Must stay registered
          // here or `parseEditorState` throws "type not found" on load.
          BlockNode,
          // Its inline counterpart (`decap-inline-block`) for PT inline
          // objects, e.g. an image in the middle of a paragraph or list item.
          InlineBlockNode,
          // Custom nodes contributed by the field's format pack.
          ...(extensions?.nodes ?? []),
        ],
        // Runs inside `editor.update()` (InitialStateExtension's function
        // form), so the document must be BUILT here with $-functions;
        // `editor.parseEditorState`/`setEditorState` are not usable in this
        // context and would leave the editor empty.
        $initialEditorState() {
          const serialized = editorSerializedState ?? editorState?.toJSON();
          if (!serialized) return;
          try {
            const children = (serialized.root?.children ?? []) as SerializedLexicalNode[];
            const root = $getRoot();
            root.clear();
            for (const child of children) {
              root.append($parseSerializedNode(child));
            }
          } catch (error) {
            // Never let a bad/unrecognised initial state crash the whole app
            // into the top-level error boundary — fall back to an empty
            // document and let the user keep editing.
            console.warn('[richtext] failed to hydrate initial editor state, starting empty:', error);
            $getRoot().clear();
          }
        },
        theme: editorTheme,
      }),
    [editorState, editorSerializedState, extensions, withImages, withTables, withCodeBlocks],
  );

  // Fill in the default chrome; explicit blocksConfig entries win.
  const blocksValue = useMemo<BlocksConfig>(
    () => ({
      renderBlockChrome: chromeProps => <BlockChrome {...chromeProps} />,
      ...blocksConfig,
    }),
    [blocksConfig],
  );

  const pickerOptions = [
    ...buildBasePickerOptions(componentPickerItems),
    ...blockPickerOptions(blocksConfig?.blocks),
    ...(extensions?.insertOptions ?? []).map(adaptInsertOption),
  ];

  return (
    <div className="bg-background overflow-hidden rounded-lg border shadow w-full">
      {/* Above the composer so BlockNode.decorate() portals see the context. */}
      <BlocksProvider value={blocksValue}>
        <LexicalExtensionComposer extension={AppExtension} contentEditable={null}>
          <TooltipProvider>
            <div className="relative">
              <ToolbarPlugin>
                {({ blockType }) => (
                  <ScrollableToolbar
                    ariaLabel="Text formatting"
                    overflowLabel="Show more formatting options"
                    underflowLabel="Show earlier formatting options"
                    wrapperClassName="sticky top-0 z-10"
                    className="vertical-align-middle flex items-center gap-2 border-b p-1"
                  >
                    {toolbarItems.undoRedo && <HistoryToolbarPlugin />}
                    {toolbarItems.undoRedo && <Separator orientation="vertical" className="h-7!" />}
                    {toolbarItems.blockFormat && (
                      <BlockFormatDropDown>
                        {blockFormatItems.paragraph && <FormatParagraph />}
                        {(() => {
                          const levels = (['h1', 'h2', 'h3'] as const).filter(
                            l => blockFormatItems[l],
                          );
                          return levels.length > 0 ? <FormatHeading levels={levels} /> : null;
                        })()}
                        {blockFormatItems.numberList && <FormatNumberedList />}
                        {blockFormatItems.bulletList && <FormatBulletedList />}
                        {blockFormatItems.checkList && <FormatCheckList />}
                        {blockFormatItems.codeBlock && <FormatCodeBlock />}
                        {blockFormatItems.blockquote && <FormatQuote />}
                      </BlockFormatDropDown>
                    )}
                    {blockType === 'code' ? <CodeLanguageToolbarPlugin /> : (
                      <>
                        {toolbarItems.fontFamily && <FontFamilyToolbarPlugin />}
                        {toolbarItems.fontSize && <FontSizeToolbarPlugin />}
                        {(toolbarItems.fontFamily || toolbarItems.fontSize) && (
                          <Separator orientation="vertical" className="h-7!" />
                        )}
                        {toolbarItems.fontFormat && <FontFormatToolbarPlugin />}
                        {toolbarItems.fontFormat && <Separator orientation="vertical" className="h-7!" />}
                        {toolbarItems.subSuper && <SubSuperToolbarPlugin />}
                        {toolbarItems.link && (
                          <LinkToolbarPlugin
                            setIsLinkEditMode={setIsLinkEditMode}
                          />
                        )}
                        {(toolbarItems.subSuper || toolbarItems.link) && (
                          <Separator orientation="vertical" className="h-7!" />
                        )}
                        {toolbarItems.clearFormatting && <ClearFormattingToolbarPlugin />}
                        {toolbarItems.clearFormatting && <Separator orientation="vertical" className="h-7!" />}
                        {toolbarItems.fontColor && <FontColorToolbarPlugin />}
                        {toolbarItems.fontBackground && <FontBackgroundToolbarPlugin />}
                        {(toolbarItems.fontColor
                          || toolbarItems.fontBackground) && <Separator orientation="vertical" className="h-7!" />}
                        {toolbarItems.fontAlignment && <ElementFormatToolbarPlugin />}
                        {toolbarItems.fontAlignment && <Separator orientation="vertical" className="h-7!" />}
                        {toolbarItems.blockInsert && (
                          <BlockInsertPlugin>
                            {blockInsertItems.divider && <InsertHorizontalRule />}
                            {blockInsertItems.image && <InsertImage />}
                            {blockInsertItems.table && <InsertTable />}
                            {Object.values(blocksConfig?.blocks ?? {}).map(definition => (
                              <InsertBlock key={definition.id} definition={definition} />
                            ))}
                          </BlockInsertPlugin>
                        )}
                      </>
                    )}
                  </ScrollableToolbar>
                )}
              </ToolbarPlugin>
              <div className="relative">
                <div className="">
                  <div className="" ref={onRef}>
                    <ContentEditable
                      placeholder={placeholder}
                      hasDragGutter={pluginItems.draggableBlock}
                      className="h-[calc(100vh-141px)]"
                      ariaRequired={ariaRequired}
                      ariaInvalid={ariaInvalid}
                      ariaErrorMessage={ariaErrorMessage}
                      ariaLabel={ariaLabel}
                      ariaDescribedBy={ariaDescribedBy}
                    />
                  </div>
                </div>
                {pluginItems.componentPicker && (
                  <ComponentPickerMenuPlugin
                    baseOptions={pickerOptions}
                    dynamicOptionsFn={withTables ? DynamicTablePickerPlugin : undefined}
                  />
                )}
                {pluginItems.emojiPicker && <EmojiPickerPlugin />}
                {pluginItems.mentions && <MentionsPlugin />}
                {blockFormatItems.codeBlock && <CodeHighlightPlugin />}
                {blockInsertItems.table && <TablePlugin />}
                {pluginItems.tabFocus && <TabFocusPlugin />}
                {pluginItems.tabIndentation && <TabIndentationPlugin />}
                {blockInsertItems.columnsLayout && <LayoutPlugin />}

                {pluginItems.floatingLinkToolbar && (
                  <FloatingLinkEditorPlugin
                    anchorElem={floatingAnchorElem}
                    isLinkEditMode={isLinkEditMode}
                    setIsLinkEditMode={setIsLinkEditMode}
                  />
                )}

                {pluginItems.draggableBlock && (
                  <DraggableBlockPlugin
                    anchorElem={floatingAnchorElem}
                    baseOptions={pickerOptions}
                    dynamicOptionsFn={withTables ? DynamicTablePickerPlugin : undefined}
                  />
                )}
                {blockFormatItems.codeBlock && <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />}

                {pluginItems.floatingTextToolbar && (
                  <FloatingTextFormatToolbarPlugin
                    anchorElem={floatingAnchorElem}
                    setIsLinkEditMode={setIsLinkEditMode}
                  />
                )}
                {pluginItems.contextMenu && <ContextMenuPlugin />}
                {pluginItems.specialText && <SpecialTextPlugin />}
              </div>
              <ActionsPlugin>
                <ScrollableToolbar
                  ariaLabel="Editor actions"
                  overflowLabel="Show more editor actions"
                  underflowLabel="Show earlier editor actions"
                  wrapperClassName="clear-both"
                  className="flex items-center justify-between gap-2 border-t p-1"
                >
                  <div className="flex flex-1 justify-start text-xs text-gray-500">
                    {
                      /* CharacterLimitPlugin (playground leftover, maxLength 30) is
                      deliberately NOT mounted: it wraps text past the limit in
                      OverflowNodes, which the code-highlight transform strips
                      from code blocks, and the two ping-pong forever - freezing
                      the tab whenever a code block pushes content past the
                      limit (e.g. the source view). Restore only with a real
                      per-field limit AND a fix for the overflow/code loop. */
                    }
                  </div>
                  <div>
                    {footerItems.characterCount && <CounterCharacterPlugin charset="UTF-16" />}
                  </div>
                  <div className="flex flex-1 justify-end">
                    {footerItems.speechToText && <SpeechToTextPlugin />}
                    {footerItems.shareContent && <ShareContentPlugin />}
                    {footerItems.exportImport && <ImportExportPlugin />}
                    {footerItems.sourceToggle && (
                      <SourceTogglePlugin
                        format={format}
                        isSourceView={isSourceView}
                        onSourceViewChange={handleSourceViewChange}
                      />
                    )}
                    {footerItems.viewOnly && <EditModeTogglePlugin />}
                    {footerItems.clearEditor && <ClearEditorActionPlugin />}
                    {footerItems.treeView && <TreeViewPlugin />}
                  </div>
                </ScrollableToolbar>
              </ActionsPlugin>
            </div>

            <OnChangePlugin
              ignoreSelectionChange={true}
              // `BlockComponent.updateData` (DCMS-1489) tags rapid successive
              // edits to the same block with `HISTORY_MERGE_TAG` so they
              // coalesce into one undo entry, plus `BLOCK_HISTORY_MERGE_TAG`
              // as a marker. `OnChangePlugin`'s built-in
              // `ignoreHistoryMergeTagChange` can't tell that apart from
              // other history-merge-tagged updates that *should* stay hidden
              // from persist (`LexicalComposer`'s initial-state hydration),
              // so it's disabled here and reimplemented below with that one
              // exception.
              ignoreHistoryMergeTagChange={false}
              onChange={(editorState, _editor, tags) => {
                // `AutoFocusExtension` calls `editor.focus()` when the root
                // element mounts, which flushes its own update tagged with
                // Lexical's internal `FOCUS_TAG` ('focus'). That update isn't
                // filtered by `ignoreSelectionChange` (it can mark nodes dirty
                // while re-establishing the selection) or by the history-merge
                // check, so it used to reach consumers as if the document had
                // just been edited — flipping a freshly-opened, untouched
                // entry's dirty flag before any keystroke (DCMS-654). A real
                // edit is never tagged this way, so it's safe to always skip.
                if (tags.has('focus')) return;
                // Reimplements `OnChangePlugin`'s default
                // `ignoreHistoryMergeTagChange` filtering: skip history-merge
                // updates unless they're a coalesced block edit (DCMS-1489),
                // which must still reach persist despite merging into the
                // undo history.
                if (tags.has(HISTORY_MERGE_TAG) && !tags.has(BLOCK_HISTORY_MERGE_TAG)) return;
                onChange?.(editorState);
                if (!onSerializedChange) return;
                if (isSourceViewRef.current) {
                  // In source view the document is a code node holding the
                  // field's source, not the content itself. Re-parse through
                  // the format's mapper so consumers (and the persist path)
                  // always receive real content, never the source-view shell.
                  const source = editorState.read(() => $getRoot().getTextContent());
                  try {
                    onSerializedChange(sourceToEditorState(source, format));
                  } catch (error) {
                    // Mid-edit invalid source: keep the consumer's last good
                    // value rather than pushing a broken document.
                    console.warn(`[richtext] source is not valid ${format}, skipping update:`, error);
                  }
                } else {
                  onSerializedChange(editorState.toJSON());
                }
              }}
            />
          </TooltipProvider>
        </LexicalExtensionComposer>
      </BlocksProvider>
    </div>
  );
}
