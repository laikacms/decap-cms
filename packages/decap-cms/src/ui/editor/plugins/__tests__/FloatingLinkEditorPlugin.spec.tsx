import { $createLinkNode, AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FloatingLinkEditorPlugin } from '@/ui/editor/plugins/FloatingLinkEditorPlugin';

const LINK_TEXT = 'link text';

interface Captured {
  editor: LexicalEditor | null,
}

function EditorCapture({ captured }: { captured: Captured }) {
  const [editor] = useLexicalComposerContext();
  captured.editor = editor;
  return null;
}

function Harness({
  captured,
  setIsLinkEditModeSpy,
  initialEditMode,
}: {
  captured: Captured,
  setIsLinkEditModeSpy: (value: boolean) => void,
  initialEditMode: boolean,
}) {
  const [anchorElem, setAnchorElem] = useState<HTMLDivElement | null>(null);
  const [isLinkEditMode, setIsLinkEditMode] = useState(initialEditMode);

  return (
    <div>
      <div ref={setAnchorElem}>
        <RichTextPlugin
          contentEditable={<ContentEditable aria-label="content" />}
          ErrorBoundary={LexicalErrorBoundary}
          placeholder={null}
        />
      </div>
      <EditorCapture captured={captured} />
      <FloatingLinkEditorPlugin
        anchorElem={anchorElem}
        isLinkEditMode={isLinkEditMode}
        setIsLinkEditMode={value => {
          setIsLinkEditModeSpy(value);
          setIsLinkEditMode(value);
        }}
      />
    </div>
  );
}

function selectLinkText(editor: LexicalEditor) {
  const root = editor.getRootElement();
  if (!root) throw new Error('editor DOM not rendered');
  const domText = document.evaluate(
    `.//text()[contains(., "${LINK_TEXT}")]`,
    root,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;
  if (!domText) throw new Error('link text node missing');
  const selection = window.getSelection();
  selection?.setBaseAndExtent(domText, 1, domText, 3);
  act(() => {
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
  });
}

async function setup(options: {
  url: string,
  editMode: boolean,
  linkClass?: typeof LinkNode | typeof AutoLinkNode,
  attrs?: { rel: string, target: string, title: string },
}) {
  const captured: Captured = { editor: null };
  const setIsLinkEditModeSpy = vi.fn();
  const toggleLinkSpy = vi.fn();
  const Class = options.linkClass ?? LinkNode;

  render(
    <LexicalComposer
      initialConfig={{
        namespace: 'floating-link-editor-spec',
        nodes: [LinkNode, AutoLinkNode],
        onError: error => {
          throw error;
        },
        editorState: () => {
          const link = Class === AutoLinkNode
            ? new AutoLinkNode(options.url, options.attrs)
            : $createLinkNode(options.url, options.attrs);
          link.append($createTextNode(LINK_TEXT));
          $getRoot().append($createParagraphNode().append(link));
        },
      }}
    >
      <Harness
        captured={captured}
        setIsLinkEditModeSpy={setIsLinkEditModeSpy}
        initialEditMode={false}
      />
    </LexicalComposer>,
  );

  const editor = captured.editor as LexicalEditor | null;
  if (!editor) throw new Error('editor not captured');
  editor.registerCommand(
    TOGGLE_LINK_COMMAND,
    payload => {
      toggleLinkSpy(payload);
      return true;
    },
    COMMAND_PRIORITY_CRITICAL,
  );

  await waitFor(() => expect(document.querySelector(`[data-lexical-text]`)).not.toBeNull());
  selectLinkText(editor);
  if (options.editMode) {
    const pencil = await waitFor(() => {
      const button = document.querySelector('button[data-variant="ghost"]');
      expect(button).not.toBeNull();
      return button as HTMLButtonElement;
    });
    fireEvent.click(pencil);
  }
  setIsLinkEditModeSpy.mockClear();
  return { editor, setIsLinkEditModeSpy, toggleLinkSpy };
}

async function findInput(): Promise<HTMLInputElement> {
  return (await waitFor(() => {
    const input = document.querySelector('input');
    expect(input).not.toBeNull();
    return input;
  })) as HTMLInputElement;
}

afterEach(() => {
  window.getSelection()?.removeAllRanges();
});

describe('FloatingLinkEditorPlugin', () => {
  describe('edit mode keyboard handling', () => {
    it('Enter with a valid URL dispatches TOGGLE_LINK_COMMAND with the sanitized URL and leaves edit mode', async () => {
      const { toggleLinkSpy, setIsLinkEditModeSpy } = await setup({ url: 'https://old.example', editMode: true });
      const input = await findInput();
      fireEvent.change(input, { target: { value: 'https://new.example/path' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(toggleLinkSpy).toHaveBeenCalledTimes(1);
      expect(toggleLinkSpy).toHaveBeenCalledWith('https://new.example/path');
      expect(setIsLinkEditModeSpy).toHaveBeenLastCalledWith(false);
    });

    it('Enter with an invalid URL dispatches nothing', async () => {
      const { toggleLinkSpy } = await setup({ url: 'https://old.example', editMode: true });
      const input = await findInput();
      fireEvent.change(input, { target: { value: 'not a url' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(toggleLinkSpy).not.toHaveBeenCalled();
    });

    it('Enter with a dangerous-protocol URL dispatches the sanitized about:blank, never the raw value', async () => {
      const { toggleLinkSpy } = await setup({ url: 'https://old.example', editMode: true });
      const input = await findInput();
      fireEvent.change(input, { target: { value: 'javascript://x.example/%0Aalert(1)' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      for (const [payload] of toggleLinkSpy.mock.calls) {
        expect(payload).toBe('about:blank');
      }
    });

    it('Escape leaves edit mode without dispatching', async () => {
      const { toggleLinkSpy, setIsLinkEditModeSpy } = await setup({ url: 'https://old.example', editMode: true });
      const input = await findInput();
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(setIsLinkEditModeSpy).toHaveBeenCalledWith(false);
      expect(toggleLinkSpy).not.toHaveBeenCalled();
    });

    it('other keys neither submit nor leave edit mode', async () => {
      const { toggleLinkSpy, setIsLinkEditModeSpy } = await setup({ url: 'https://old.example', editMode: true });
      const input = await findInput();
      fireEvent.keyDown(input, { key: 'a' });

      expect(toggleLinkSpy).not.toHaveBeenCalled();
      expect(setIsLinkEditModeSpy).not.toHaveBeenCalled();
    });
  });

  describe('submit button guard', () => {
    it('is disabled for an invalid URL and enabled for a valid one', async () => {
      await setup({ url: 'https://old.example', editMode: true });
      const input = await findInput();
      const buttons = Array.from(document.querySelectorAll('button'));
      const submit = buttons[buttons.length - 1];

      fireEvent.change(input, { target: { value: 'not a url' } });
      expect(submit.disabled).toBe(true);
      fireEvent.change(input, { target: { value: 'https://ok.example' } });
      expect(submit.disabled).toBe(false);
    });

    it('clicking submit dispatches TOGGLE_LINK_COMMAND with the URL', async () => {
      const { toggleLinkSpy } = await setup({ url: 'https://old.example', editMode: true });
      const input = await findInput();
      fireEvent.change(input, { target: { value: 'https://clicked.example' } });
      const buttons = Array.from(document.querySelectorAll('button'));
      fireEvent.click(buttons[buttons.length - 1]);

      expect(toggleLinkSpy).toHaveBeenCalledWith('https://clicked.example');
    });
  });

  describe('preview anchor', () => {
    it('renders the link URL as the preview href', async () => {
      await setup({ url: 'https://example.com/page', editMode: false });
      const anchor = await waitFor(() => {
        const a = document.querySelector('a[target="_blank"]');
        expect(a).not.toBeNull();
        return a as HTMLAnchorElement;
      });
      expect(anchor.getAttribute('href')).toBe('https://example.com/page');
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('renders about:blank for a javascript: URL instead of the raw value', async () => {
      await setup({ url: 'javascript:alert(1)', editMode: false });
      const anchor = await waitFor(() => {
        const a = document.querySelector('a[target="_blank"]');
        expect(a).not.toBeNull();
        return a as HTMLAnchorElement;
      });
      expect(anchor.getAttribute('href')).toBe('about:blank');
      expect(screen.queryByText('javascript:alert(1)')).not.toBeNull();
    });
  });

  describe('auto-link replacement', () => {
    it('replaces an AutoLinkNode parent with a plain LinkNode keeping rel/target/title', async () => {
      const { editor } = await setup({
        url: 'https://auto.example',
        editMode: true,
        linkClass: AutoLinkNode,
        attrs: { rel: 'nofollow', target: '_self', title: 'auto title' },
      });
      const input = await findInput();
      fireEvent.change(input, { target: { value: 'https://auto.example' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        editor.getEditorState().read(() => {
          const link = $getRoot().getFirstChild()?.getChildren()[0];
          expect(link).toBeInstanceOf(LinkNode);
          expect(link).not.toBeInstanceOf(AutoLinkNode);
          const linkNode = link as LinkNode;
          expect(linkNode.getURL()).toBe('https://auto.example');
          expect(linkNode.getRel()).toBe('nofollow');
          expect(linkNode.getTarget()).toBe('_self');
          expect(linkNode.getTitle()).toBe('auto title');
        });
      });
    });
  });
});
