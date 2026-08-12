import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/ui/Button';
import { useReport } from '@/ui/editor/editor-hooks/useReport';
import { CAN_USE_DOM } from '@/ui/editor/shared/can-use-dom';
import { MicIcon } from '@/ui/icons/index';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/Tooltip';

import type { LexicalCommand, LexicalEditor, RangeSelection } from 'lexical';

// Minimal Web Speech API surface used by this file. Not part of the DOM lib types,
// so we declare just enough of the non-standard `window.SpeechRecognition` /
// `window.webkitSpeechRecognition` globals to avoid suppressing the type-checker.
interface SpeechRecognitionResultItem {
  isFinal: boolean;
  item(index: number): { transcript: string };
}

interface SpeechRecognitionResultList {
  item(index: number): SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  addEventListener(type: 'result', listener: (event: SpeechRecognitionEvent) => void): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export const SPEECH_TO_TEXT_COMMAND: LexicalCommand<boolean> = createCommand('SPEECH_TO_TEXT_COMMAND');

const VOICE_COMMANDS: Readonly<
  Record<string, (arg0: { editor: LexicalEditor, selection: RangeSelection }) => void>
> = {
  '\n': ({ selection }) => {
    selection.insertParagraph();
  },
  redo: ({ editor }) => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  },
  undo: ({ editor }) => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  },
};

export const SUPPORT_SPEECH_RECOGNITION: boolean = CAN_USE_DOM
  && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

function SpeechToTextPluginImpl() {
  const [editor] = useLexicalComposerContext();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isSpeechToText, setIsSpeechToText] = useState(false);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = useRef<SpeechRecognitionInstance | null>(null);
  const report = useReport();

  useEffect(() => {
    if (!SpeechRecognition) {
      return;
    }

    if (isEnabled && recognition.current === null) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.addEventListener('result', (event: SpeechRecognitionEvent) => {
        const resultItem = event.results.item(event.resultIndex);
        const { transcript } = resultItem.item(0);
        report(transcript);

        if (!resultItem.isFinal) {
          return;
        }

        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            const command = VOICE_COMMANDS[transcript.toLowerCase().trim()];

            if (command) {
              command({
                editor,
                selection,
              });
            } else if (transcript.match(/\s*\n\s*/)) {
              selection.insertParagraph();
            } else {
              selection.insertText(transcript);
            }
          }
        });
      });
    }

    if (recognition.current) {
      if (isEnabled) {
        recognition.current.start();
      } else {
        recognition.current.stop();
      }
    }

    return () => {
      if (recognition.current !== null) {
        recognition.current.stop();
      }
    };
  }, [SpeechRecognition, editor, isEnabled, report]);
  useEffect(() => {
    return editor.registerCommand(
      SPEECH_TO_TEXT_COMMAND,
      (_isEnabled: boolean) => {
        setIsEnabled(_isEnabled);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            onClick={() => {
              editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
              setIsSpeechToText(!isSpeechToText);
            }}
            variant={isSpeechToText ? 'secondary' : 'ghost'}
            title="Speech To Text"
            aria-label={`${isSpeechToText ? 'Disable' : 'Enable'} speech to text`}
            className="p-2"
            size={'sm'}
          >
            <MicIcon className="size-4" />
          </Button>
        }
      />
      <TooltipContent>Speech To Text</TooltipContent>
    </Tooltip>
  );
}

export const SpeechToTextPlugin = SUPPORT_SPEECH_RECOGNITION ? SpeechToTextPluginImpl : () => null;
