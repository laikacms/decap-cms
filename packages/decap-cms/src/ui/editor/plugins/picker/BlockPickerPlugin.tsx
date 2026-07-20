import { PuzzleIcon } from '@/ui/icons/index';
import { $insertBlock } from '@/lib/richtext/lexical';
import { ComponentPickerOption } from './ComponentPickerOption';

import type { BlockDefinition, EditorInsertOption } from '@/lib/richtext';

/** Slash-menu options for the blocks available to this editor instance. */
export function blockPickerOptions(
  blocks: Record<string, BlockDefinition> | undefined,
): ComponentPickerOption[] {
  return Object.values(blocks ?? {}).map(
    definition =>
      new ComponentPickerOption(definition.label ?? definition.id, {
        icon: <>{definition.icon ?? <PuzzleIcon className="size-4" />}</>,
        keywords: [definition.id, 'block', ...(definition.keywords ?? [])],
        onSelect: (_queryString, editor) => editor.update(() => $insertBlock(definition)),
      }),
  );
}

/** Adapt a format pack's declarative insert option to a slash-menu option. */
export function adaptInsertOption(option: EditorInsertOption): ComponentPickerOption {
  return new ComponentPickerOption(option.title, {
    icon: option.icon !== undefined ? <>{option.icon}</> : undefined,
    keywords: option.keywords ?? [],
    onSelect: (_queryString, editor) => option.onSelect(editor),
  });
}
