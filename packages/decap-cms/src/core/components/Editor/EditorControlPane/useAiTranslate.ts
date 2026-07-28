/**
 * One-click AI translation of entry content (DCMS-1395)
 *
 * Headless hook that drives the existing AI adapter (`src/ai/decap-ai.ts`,
 * `POST {apiBasePath}/chat`) to translate a set of field values from one
 * locale to another. It reuses the same `useChat` transport + client-side
 * `updateDocument` tool round-trip already implemented by
 * `src/widgets/aichat/AiChatControl.tsx`, so it inherits whatever provider
 * (Anthropic/OpenAI/etc.) the consumer configured for `decapAi()` — no new
 * provider mechanism is introduced.
 *
 * Field application is delegated to the caller via `onFieldTranslated` so
 * this hook stays decoupled from Redux; `EditorControlPane` wires it through
 * the same `props.onChange` path used by the existing "copy from locale"
 * action.
 */
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback, useMemo, useRef, useState } from 'react';

import { buildTranslatePrompt, extractTranslatedFields, type TranslatableFieldValue } from './aiTranslate';

export interface UseAiTranslateOptions {
  /** Base path for the AI endpoints, matches the aichat widget default. */
  apiBasePath?: string;
  fetch?: typeof fetch;
}

export interface TranslateParams {
  sourceLocale: string;
  targetLocale: string;
  slug: string;
  collection?: string;
  /** Translatable field values read from the source locale. */
  fields: TranslatableFieldValue[];
  onFieldTranslated: (fieldName: string, value: unknown) => void;
}

export interface UseAiTranslateResult {
  translate: (params: TranslateParams) => Promise<void>;
  isTranslating: boolean;
  error: string | null;
}

export function useAiTranslate(options: UseAiTranslateOptions = {}): UseAiTranslateResult {
  const apiBasePath = options.apiBasePath ?? '/api/ai';
  const aiFetch = options.fetch ?? fetch;
  const chatEndpoint = `${apiBasePath}/chat`;

  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsRef = useRef<TranslateParams | null>(null);

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: chatEndpoint,
      fetch: aiFetch,
      body: () => ({
        document: {
          slug: paramsRef.current?.slug ?? 'untitled',
          collection: paramsRef.current?.collection,
        },
      }),
    });
  }, [chatEndpoint, aiFetch]);

  const chatHelpersRef = useRef<ReturnType<typeof useChat> | null>(null);

  const chatHelpers = useChat({
    transport,
    onToolCall: ({ toolCall }: { toolCall: any }) => {
      const params = paramsRef.current;
      const toolName: string = toolCall.toolName
        ?? (toolCall.type ? String(toolCall.type).replace('tool-', '') : 'unknown');
      const toolCallId = toolCall.toolCallId;

      const addOutput = (output: unknown) => {
        chatHelpersRef.current?.addToolOutput({
          tool: toolName as never,
          toolCallId,
          state: 'output-available',
          output,
        });
      };

      if (!params) {
        addOutput({ success: false, error: 'No active translation request' });
        return;
      }

      switch (toolName) {
        case 'getDocumentData': {
          const data: Record<string, unknown> = {};
          params.fields.forEach(f => {
            data[f.name] = f.value;
          });
          addOutput({
            success: true,
            slug: params.slug,
            collection: params.collection,
            locale: params.sourceLocale,
            data,
          });
          break;
        }

        case 'updateDocument': {
          const args = toolCall.input || toolCall.args || {};
          const operations = (args as { operations?: { op: string, path: string, value?: unknown }[] })
            .operations ?? [];
          const knownFieldNames = params.fields.map(f => f.name);
          const translated = extractTranslatedFields(operations, knownFieldNames);

          translated.forEach(f => params.onFieldTranslated(f.name, f.value));

          addOutput({ success: true, translatedFields: translated.map(f => f.name) });
          break;
        }

        default:
          addOutput({ success: false, error: `Unknown tool: "${toolName}"` });
          break;
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      setIsTranslating(false);
    },
    onFinish: () => {
      setIsTranslating(false);
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  chatHelpersRef.current = chatHelpers;

  const translate = useCallback(async (params: TranslateParams) => {
    if (params.fields.length === 0) return;

    paramsRef.current = params;
    setError(null);
    setIsTranslating(true);
    chatHelpers.setMessages([]);

    const prompt = buildTranslatePrompt(params);

    try {
      await chatHelpers.sendMessage({ text: prompt });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsTranslating(false);
    }
  }, [chatHelpers]);

  return { translate, isTranslating, error };
}

export default useAiTranslate;
