import { AlignmentPickerPlugin } from './AlignmentPickerPlugin';
import { BulletedListPickerPlugin } from './BulletedListPickerPlugin';
import { CheckListPickerPlugin } from './CheckListPickerPlugin';
import { CodePickerPlugin } from './CodePickerPlugin';
import { DateTimePickerPlugin } from './DateTimePickerPlugin';
import { DividerPickerPlugin } from './DividerPickerPlugin';
import { HeadingPickerPlugin } from './HeadingPickerPlugin';
import { ImagePickerPlugin } from './ImagePickerPlugin';
import { NumberedListPickerPlugin } from './NumberedListPickerPlugin';
import { ParagraphPickerPlugin } from './ParagraphPickerPlugin';
import { QuotePickerPlugin } from './QuotePickerPlugin';
import { TablePickerPlugin } from './TablePickerPlugin';

import type { ComponentPickerOption } from './ComponentPickerOption';

/**
 * The built-in slash-menu options, gated per item. Shared by the component
 * picker and the draggable-block "+" menu (previously two copy-pasted lists
 * in Editor.tsx).
 */
export function buildBasePickerOptions(
  items: Record<string, boolean>,
): ComponentPickerOption[] {
  return [
    ...(items.paragraph ? [ParagraphPickerPlugin()] : []),
    ...(items.h1 ? [HeadingPickerPlugin({ n: 1 })] : []),
    ...(items.h2 ? [HeadingPickerPlugin({ n: 2 })] : []),
    ...(items.h3 ? [HeadingPickerPlugin({ n: 3 })] : []),
    ...(items.table ? [TablePickerPlugin()] : []),
    ...(items.checkList ? [CheckListPickerPlugin()] : []),
    ...(items.numberList ? [NumberedListPickerPlugin()] : []),
    ...(items.bulletList ? [BulletedListPickerPlugin()] : []),
    ...(items.blockquote ? [QuotePickerPlugin()] : []),
    ...(items.codeBlock ? [CodePickerPlugin()] : []),
    // tweet/youtube embeds are registry blocks now (see widgets/richtext/blocks);
    // the columns layout lost its content at persist and its insert entries are
    // removed until it becomes a block too (nodes stay registered for hydration).
    ...(items.divider ? [DividerPickerPlugin()] : []),
    ...(items.image ? [ImagePickerPlugin()] : []),
    ...(items.dateTime ? [DateTimePickerPlugin()] : []),
    ...(items.alignLeft ? [AlignmentPickerPlugin({ alignment: 'left' })] : []),
    ...(items.alignCenter ? [AlignmentPickerPlugin({ alignment: 'center' })] : []),
    ...(items.alignRight ? [AlignmentPickerPlugin({ alignment: 'right' })] : []),
    ...(items.alignJustify ? [AlignmentPickerPlugin({ alignment: 'justify' })] : []),
  ];
}
