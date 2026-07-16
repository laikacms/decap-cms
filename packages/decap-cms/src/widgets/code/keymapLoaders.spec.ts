import { describe, expect, it, vi } from 'vitest';

import { getKeymapExtension } from '@/widgets/code/keymapLoaders';

const emulations = vi.hoisted(() => ({
  emacs: vi.fn(() => ['emacs-extension']),
  vim: vi.fn(() => ['vim-extension']),
}));

vi.mock('@replit/codemirror-emacs', () => ({ emacs: emulations.emacs }));
vi.mock('@replit/codemirror-vim', () => ({ vim: emulations.vim }));
vi.mock('@replit/codemirror-vscode-keymap', () => ({ vscodeKeymap: [] }));

describe('getKeymapExtension', () => {
  it('resolves the emacs emulation', async () => {
    await expect(getKeymapExtension('emacs')).resolves.toEqual(['emacs-extension']);
    expect(emulations.emacs).toHaveBeenCalled();
  });

  it('resolves the vim emulation', async () => {
    await expect(getKeymapExtension('vim')).resolves.toEqual(['vim-extension']);
    expect(emulations.vim).toHaveBeenCalled();
  });

  it('resolves the vscode keymap as an extension', async () => {
    await expect(getKeymapExtension('vscode')).resolves.not.toBeNull();
  });

  it('returns null for the default keymap', async () => {
    await expect(getKeymapExtension('default')).resolves.toBeNull();
  });

  it('returns null for unknown keymaps', async () => {
    await expect(getKeymapExtension('sublime')).resolves.toBeNull();
  });
});
