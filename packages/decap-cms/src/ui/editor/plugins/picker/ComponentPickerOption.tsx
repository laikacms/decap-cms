import { MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { type LexicalEditor } from 'lexical';
import { type JSX } from 'react';

export class ComponentPickerOption extends MenuOption {
  // What shows up in the editor
  title: string;
  // `icon` is inherited from `MenuOption`; it stays absent (rather than set to
  // undefined) for options without one.
  // For extra searching.
  keywords: Array<string>;
  // TBD
  keyboardShortcut: string | undefined;
  // What happens when you select this option?
  onSelect: (
    queryString: string,
    editor: LexicalEditor,
    showModal: (
      title: string,
      showModal: (onClose: () => void) => JSX.Element,
    ) => void,
  ) => void;

  constructor(
    title: string,
    options: {
      icon?: JSX.Element | undefined,
      keywords?: Array<string>,
      keyboardShortcut?: string,
      onSelect: (
        queryString: string,
        editor: LexicalEditor,
        showModal: (
          title: string,
          showModal: (onClose: () => void) => JSX.Element,
        ) => void,
      ) => void,
    },
  ) {
    super(title);
    this.title = title;
    this.keywords = options.keywords || [];
    if (options.icon !== undefined) {
      this.icon = options.icon;
    }
    this.keyboardShortcut = options.keyboardShortcut;
    this.onSelect = options.onSelect.bind(this);
  }
}
