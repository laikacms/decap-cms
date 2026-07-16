// Resolves keymap emulation extensions for the code widget.
//
// The vim/emacs/vscode emulations are heavyweight and most users never enable
// them, so each one is dynamically imported the first time it's selected and
// only lands in the bundle chunk for that keymap. 'default' (and anything
// unrecognized) resolves to null, meaning CodeMirror's built-in keymap.
import type { Extension } from '@codemirror/state';

export async function getKeymapExtension(keyMap: string): Promise<Extension | null> {
  switch (keyMap) {
    case 'emacs': {
      const { emacs } = await import('@replit/codemirror-emacs');
      return emacs();
    }
    case 'vim': {
      const { vim } = await import('@replit/codemirror-vim');
      return vim();
    }
    case 'vscode': {
      const [{ keymap }, { vscodeKeymap }] = await Promise.all([
        import('@codemirror/view'),
        import('@replit/codemirror-vscode-keymap'),
      ]);
      return keymap.of(vscodeKeymap);
    }
    default:
      return null;
  }
}
