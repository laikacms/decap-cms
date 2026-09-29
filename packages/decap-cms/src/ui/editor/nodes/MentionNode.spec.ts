import { $createParagraphNode, $getRoot, $createTextNode } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import {
  $createMentionNode,
  $isMentionNode,
  MentionNode,
} from '@/ui/editor/nodes/mention-node';

function withEditor<T>(fn: () => T): T {
  const editor = createHeadlessEditor([MentionNode]);
  let result!: T;
  editor.update(
    () => {
      result = fn();
    },
    { discrete: true },
  );
  return result;
}

describe('$createMentionNode', () => {
  it('creates a segmented, directionless node using the name as text', () => {
    const { mode, directionless, text, type } = withEditor(() => {
      const node = $createMentionNode('alice');
      $getRoot().append($createParagraphNode().append(node));
      return {
        mode: node.getMode(),
        directionless: node.isDirectionless(),
        text: node.getTextContent(),
        type: node.getType(),
      };
    });
    expect(mode).toBe('segmented');
    expect(directionless).toBe(true);
    expect(text).toBe('alice');
    expect(type).toBe('mention');
  });
});

describe('$isMentionNode', () => {
  it('is true for a MentionNode', () => {
    expect(withEditor(() => $isMentionNode($createMentionNode('bob')))).toBe(true);
  });

  it('is false for other nodes', () => {
    expect(withEditor(() => $isMentionNode($createTextNode('bob')))).toBe(false);
  });

  it('is false for null and undefined', () => {
    expect($isMentionNode(null)).toBe(false);
    expect($isMentionNode(undefined)).toBe(false);
  });
});

describe('MentionNode text insertion boundaries', () => {
  it('refuses text insertion before and after', () => {
    const { before, after } = withEditor(() => {
      const node = $createMentionNode('carol');
      return { before: node.canInsertTextBefore(), after: node.canInsertTextAfter() };
    });
    expect(before).toBe(false);
    expect(after).toBe(false);
  });
});

describe('MentionNode JSON serialization', () => {
  it('exports type, version and mentionName', () => {
    const json = withEditor(() => $createMentionNode('dave').exportJSON());
    expect(json.type).toBe('mention');
    expect(json.version).toBe(1);
    expect(json.mentionName).toBe('dave');
    expect(json.text).toBe('dave');
  });

  it('round-trips mentionName, text, format and mode', () => {
    const restored = withEditor(() => {
      const original = $createMentionNode('erin');
      original.setTextContent('@erin');
      original.setFormat(1);
      const copy = MentionNode.importJSON(original.exportJSON());
      $getRoot().append($createParagraphNode().append(copy));
      return {
        isMention: $isMentionNode(copy),
        json: copy.exportJSON(),
        mode: copy.getMode(),
        format: copy.getFormat(),
        text: copy.getTextContent(),
      };
    });
    expect(restored.isMention).toBe(true);
    expect(restored.json.mentionName).toBe('erin');
    expect(restored.text).toBe('@erin');
    expect(restored.format).toBe(1);
    expect(restored.mode).toBe('segmented');
  });
});

describe('MentionNode DOM import/export', () => {
  it('exports a span with data-lexical-mention', () => {
    const { tag, attr, text } = withEditor(() => {
      const { element } = $createMentionNode('frank').exportDOM();
      const el = element as HTMLElement;
      return {
        tag: el.tagName,
        attr: el.getAttribute('data-lexical-mention'),
        text: el.textContent,
      };
    });
    expect(tag).toBe('SPAN');
    expect(attr).toBe('true');
    expect(text).toBe('frank');
  });

  it('importDOM matches a span carrying data-lexical-mention', () => {
    const doc = new DOMParser().parseFromString(
      '<span data-lexical-mention="true">@gina</span>',
      'text/html',
    );
    const span = doc.querySelector('span')!;
    const match = MentionNode.importDOM()!.span!(span);
    expect(match).not.toBeNull();
    expect(match!.priority).toBe(1);

    const output = withEditor(() => {
      const converted = match!.conversion(span);
      const node = converted && (converted.node as MentionNode);
      return node && { isMention: $isMentionNode(node), text: node.getTextContent() };
    });
    expect(output).toEqual({ isMention: true, text: '@gina' });
  });

  it('importDOM ignores plain spans', () => {
    const doc = new DOMParser().parseFromString('<span>plain</span>', 'text/html');
    const span = doc.querySelector('span')!;
    expect(MentionNode.importDOM()!.span!(span)).toBeNull();
  });
});
