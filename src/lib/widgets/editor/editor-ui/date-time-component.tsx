import * as React from 'react';
import { useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import {
  $getNodeByKey,
  IS_BOLD,
  IS_HIGHLIGHT,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  type NodeKey,
} from 'lexical';
import { CalendarIcon } from 'lucide-react';

import { $isDateTimeNode, type DateTimeNode } from '@/lib/widgets/editor/nodes/date-time-node';
import { css, cx } from '@/lib/widgets/editor/ui/_styled';
import { Button } from '@/lib/widgets/editor/ui/button';
import { Checkbox } from '@/lib/widgets/editor/ui/checkbox';
import { Input } from '@/lib/widgets/editor/ui/input';
import { Label } from '@/lib/widgets/editor/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/widgets/editor/ui/popover';
import {
  formatDateTime,
  fromDateInputValue,
  setLocalTime,
  toDateInputValue,
} from '@/lib/widgets/editor/utils/date-time';

import type { ReactNode } from 'react';

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const triggerClass = css`
  display: inline-flex;
  height: auto;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 400;
  &[data-empty='true'] {
    color: var(--muted-foreground);
  }
  &[data-selected='true'] {
    box-shadow: 0 0 0 2px var(--primary);
  }
`;

const boldClass = css`
  font-weight: 700;
`;
const italicClass = css`
  font-style: italic;
`;
const underlineClass = css`
  text-decoration: underline;
`;
const strikeClass = css`
  text-decoration: line-through;
`;
const highlightClass = css`
  background-color: #fef08a;
  &:hover {
    background-color: rgb(254 240 138 / 0.8);
  }
`;

const contentClass = css`
  width: 18rem;
  padding: 0.75rem;
`;

const dateInputClass = css`
  width: 100%;
`;

const timeRowWrapper = css`
  border-top: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
`;

const flexRow = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const timeInputClass = css`
  height: 1.75rem;
  width: 7rem;
  padding: 0 0.375rem;
  font-size: 0.75rem;
`;

const zoneTextClass = css`
  font-size: 0.75rem;
  color: var(--muted-foreground);
`;

const calendarIconClass = css`
  width: 0.875rem;
  height: 0.875rem;
`;

interface Props {
  dateTime: Date | undefined;
  format: number;
  nodeKey: NodeKey;
}

export default function DateTimeComponent({
  dateTime,
  format: textFormat,
  nodeKey,
}: Props): ReactNode {
  const [editor] = useLexicalComposerContext();
  const [selected, setSelected] = useState(dateTime);
  const [includeTime, setIncludeTime] = useState(() => {
    if (!dateTime) return false;
    return dateTime.getHours() !== 0 || dateTime.getMinutes() !== 0;
  });
  const [timeValue, setTimeValue] = useState(() => {
    if (!dateTime) return '00:00';
    const h = dateTime.getHours();
    const m = dateTime.getMinutes();
    if (h !== 0 || m !== 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    return '00:00';
  });
  const [isNodeSelected] = useLexicalNodeSelection(nodeKey);

  const withDateTimeNode = (cb: (node: DateTimeNode) => void): void => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isDateTimeNode(node)) cb(node);
    });
  };

  const handleCheckedChange = (checked: boolean): void => {
    withDateTimeNode(node => {
      if (checked) {
        setIncludeTime(true);
      } else {
        if (selected) node.setDateTime(setLocalTime(selected, 0, 0));
        setIncludeTime(false);
        setTimeValue('00:00');
      }
    });
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    withDateTimeNode(node => {
      const time = event.target.value;
      if (!selected) {
        setTimeValue(time);
        return;
      }
      const parts = time.split(':').map(s => parseInt(s, 10));
      const newDate = setLocalTime(selected, parts[0] ?? 0, parts[1] ?? 0);
      setSelected(newDate);
      node.setDateTime(newDate);
      setTimeValue(time);
    });
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    withDateTimeNode(node => {
      const parts = timeValue.split(':').map(s => parseInt(s, 10));
      const newDate = fromDateInputValue(event.target.value, parts[0] ?? 0, parts[1] ?? 0);
      if (!newDate) {
        setSelected(undefined);
        return;
      }
      node.setDateTime(newDate);
      setSelected(newDate);
    });
  };

  const displayLabel = dateTime ? formatDateTime(dateTime, includeTime) : null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            data-empty={!dateTime}
            data-selected={isNodeSelected}
            className={cx(
              triggerClass,
              textFormat & IS_BOLD ? boldClass : '',
              textFormat & IS_ITALIC ? italicClass : '',
              textFormat & IS_UNDERLINE ? underlineClass : '',
              textFormat & IS_STRIKETHROUGH ? strikeClass : '',
              textFormat & IS_HIGHLIGHT ? highlightClass : '',
            )}
          >
            <CalendarIcon className={calendarIconClass} />
            {displayLabel ?? <span>Pick a date</span>}
          </Button>
        }
      />
      <PopoverContent className={contentClass} align="start">
        <Input
          type="date"
          aria-label="Date"
          min="1925-01-01"
          max="2042-08-31"
          value={toDateInputValue(selected)}
          onChange={handleDateChange}
          className={dateInputClass}
        />
        <div className={timeRowWrapper}>
          <div className={flexRow}>
            <Checkbox
              id={`include-time-${nodeKey}`}
              checked={includeTime}
              onCheckedChange={checked => handleCheckedChange(checked === true)}
            />
            <Label htmlFor={`include-time-${nodeKey}`} className={flexRow}>
              <Input
                type="time"
                value={timeValue}
                onChange={handleTimeChange}
                disabled={!includeTime}
                className={timeInputClass}
              />
              <span className={zoneTextClass}>{userTimeZone}</span>
            </Label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
