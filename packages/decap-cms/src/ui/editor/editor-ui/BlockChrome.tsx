import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey } from 'lexical';

import { useBlocksConfig } from '@/lib/richtext/lexical';
import { Button } from '@/ui/Button';
import { PencilIcon, PuzzleIcon, Trash2Icon, XIcon } from '@/ui/icons/index';

import type { BlockChromeProps } from '@/lib/richtext';
import type { ReactNode } from 'react';

/**
 * Default chrome for a custom block inside the editor: a bordered card in
 * document flow with a label header, edit/delete actions, the block's
 * preview, and (while editing) the injected inline prop form beneath it.
 *
 * Unknown blocks (no registered definition) render as a read-only card that
 * preserves their data; inline blocks render as a compact chip
 * (read-only besides delete, for now).
 */
export function BlockChrome(props: BlockChromeProps): ReactNode {
  const {
    definition,
    componentId,
    data,
    nodeKey,
    inline,
    isEditing,
    openEditor,
    closeEditor,
    updateData,
  } = props;
  const [editor] = useLexicalComposerContext();
  const { renderBlockForm, getAsset } = useBlocksConfig();

  const label = definition?.label ?? componentId;
  const icon = definition?.icon ?? <PuzzleIcon className="size-3.5" />;

  const removeNode = () => {
    editor.update(() => {
      $getNodeByKey(nodeKey)?.remove();
    });
  };

  if (inline) {
    return (
      <span
        data-block-chrome={componentId}
        className="inline-flex items-center gap-1 rounded border bg-muted/50 px-1 py-0.5 align-baseline text-xs"
      >
        {icon}
        <span>{label}</span>
        <Button
          variant="ghost"
          size="sm"
          className="size-4 p-0"
          aria-label={`Delete ${label} block`}
          onClick={removeNode}
        >
          <XIcon className="size-3" />
        </Button>
      </span>
    );
  }

  const preview = definition?.preview
    ? <definition.preview data={data} definition={definition} getAsset={getAsset} inline={false} />
    : (
      <pre className="overflow-auto rounded bg-muted/50 p-2 text-xs">
      {JSON.stringify(data, null, 2)}
      </pre>
    );

  return (
    <div data-block-chrome={componentId} className="my-2 rounded-md border">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-2 py-1">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {icon}
          {label}
        </span>
        <span className="flex items-center gap-0.5">
          {definition
            && (isEditing
              ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-6 p-1"
                  aria-label={`Close ${label} editor`}
                  onClick={closeEditor}
                >
                  <XIcon className="size-3.5" />
                </Button>
              )
              : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-6 p-1"
                  aria-label={`Edit ${label} block`}
                  onClick={openEditor}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              ))}
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-1"
            aria-label={`Delete ${label} block`}
            onClick={removeNode}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </span>
      </div>
      <div className="px-3 py-2">
        {preview}
        {!definition && (
          <p className="mt-1 text-xs text-muted-foreground">
            Unknown block "{componentId}". Its data is preserved and will round-trip unchanged.
          </p>
        )}
      </div>
      {isEditing && definition && (
        <div
          className="border-t px-3 py-2"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              closeEditor();
            }
          }}
        >
          {renderBlockForm
            ? (
              renderBlockForm({
                definition,
                value: data,
                onChange: updateData,
                onClose: closeEditor,
              })
            )
            : (
              <p className="text-xs text-muted-foreground">
                No block form renderer is configured for this editor.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
