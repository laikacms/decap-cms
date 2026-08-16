import { getToolName, isToolUIPart } from 'ai';

import type { LlmMessage, LlmToolCall } from '@laikacms/decap-cms/lib/util';
import type { UIMessage } from 'ai';

/**
 * Translation between the AI SDK's `UIMessage` (parts, tool states, metadata)
 * and the CMS's `LlmMessage` (text plus a flat list of tool calls). The CMS UI
 * is deliberately ignorant of the SDK, so this is the only place the two
 * vocabularies meet.
 */

/**
 * Metadata flag for a prompt that drove the session without joining the
 * transcript — `sendPrompt(text, { visible: false })`, which is how the
 * translate action reuses the chat's session without filling it with generated
 * instructions. The model still sees the message; the user does not.
 */
export const HIDDEN_METADATA_KEY = 'dullaHidden';

interface HiddenMetadata {
  [HIDDEN_METADATA_KEY]?: boolean;
}

function isHidden(message: UIMessage): boolean {
  const metadata = message.metadata as HiddenMetadata | undefined;
  return metadata?.[HIDDEN_METADATA_KEY] === true;
}

/** `output-available` / `input-streaming` / … collapsed to the CMS's three states. */
function toToolStatus(state: string): LlmToolCall['status'] {
  if (state === 'output-error') return 'error';
  if (state === 'output-available') return 'done';
  return 'pending';
}

/**
 * A one-line summary of what a tool call did, for the transcript. Only
 * `updateDocument` has something worth saying, and it says it with the field
 * names the CMS reported back as changed.
 */
function toToolSummary(name: string, output: unknown, errorText: string | undefined): string | undefined {
  if (errorText) return errorText;
  if (!output || typeof output !== 'object') return undefined;

  const result = output as { changed?: unknown, error?: unknown };
  if (typeof result.error === 'string') return result.error;
  if (name === 'updateDocument' && Array.isArray(result.changed) && result.changed.length > 0) {
    return `updated ${result.changed.join(', ')}`;
  }
  return undefined;
}

function toToolCalls(message: UIMessage): LlmToolCall[] {
  const calls: LlmToolCall[] = [];

  for (const part of message.parts) {
    if (!isToolUIPart(part)) continue;

    const errorText = 'errorText' in part && typeof part.errorText === 'string' ? part.errorText : undefined;
    const output = 'output' in part ? part.output : undefined;
    const name = getToolName(part);
    const summary = toToolSummary(name, output, errorText);

    calls.push({
      id: part.toolCallId,
      name,
      status: toToolStatus(part.state),
      ...(summary === undefined ? {} : { summary }),
    });
  }

  return calls;
}

function toText(message: UIMessage): string {
  return message.parts
    .filter(part => part.type === 'text')
    .map(part => part.text)
    .join('');
}

/**
 * Project the SDK's message list onto the CMS's, dropping hidden prompts and
 * any message that would render as nothing at all (an assistant turn that only
 * carried a step marker, say).
 */
export function toLlmMessages(messages: readonly UIMessage[]): LlmMessage[] {
  const projected: LlmMessage[] = [];

  for (const message of messages) {
    if (isHidden(message)) continue;
    if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system') continue;

    const text = toText(message);
    const toolCalls = toToolCalls(message);
    if (text === '' && toolCalls.length === 0) continue;

    projected.push({
      id: message.id,
      role: message.role,
      text,
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
    });
  }

  return projected;
}

/** Messages restored from a persisted session, which arrive in wire shape. */
export function fromStoredMessages(messages: unknown): UIMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages.flatMap((message): UIMessage[] => {
    if (!message || typeof message !== 'object') return [];
    const stored = message as { id?: unknown, role?: unknown, parts?: unknown, metadata?: unknown };
    if (typeof stored.id !== 'string' || typeof stored.role !== 'string') return [];

    return [{
      id: stored.id,
      role: stored.role as UIMessage['role'],
      parts: (Array.isArray(stored.parts) ? stored.parts : []) as UIMessage['parts'],
      ...(stored.metadata === undefined ? {} : { metadata: stored.metadata }),
    }];
  });
}
