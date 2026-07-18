/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import React from 'react';

import { buttons } from '@/ui/default/index';

dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.extend(utc);

interface ButtonsProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  fieldName: string;
  handleChange: (value: string) => void;
  getNow: () => string;
}

function Buttons({ t, fieldName, handleChange, getNow }: ButtonsProps) {
  return (
    <div
      css={css`
        display: flex;
        gap: 20px;
        width: fit-content;
      `}
    >
      <button
        aria-label={t('editor.editorWidgets.datetime.setToNow', { fieldLabel: fieldName })}
        css={css`
          ${buttons.button}
          ${buttons.widget}
        `}
        onClick={() => handleChange(getNow())}
        data-testid="now-button"
      >
        {t('editor.editorWidgets.datetime.now')}
      </button>
      <button
        css={css`
          ${buttons.button}
          ${buttons.widget}
        `}
        onClick={() => handleChange('')}
        data-testid="clear-button"
      >
        {t('editor.editorWidgets.datetime.clear')}
      </button>
    </div>
  );
}

interface DateTimeControlProps {
  field: Record<string, unknown>;
  forID?: string;
  onChange: (value: string, metadata?: Record<string, unknown>) => void;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  value?: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  isDisabled?: boolean;
  hasErrors?: boolean;
  errorListId?: string;
}

function escapeZ(str: string): string {
  if (/Z(?![\]])/.test(str)) {
    return str.replace('Z', '[Z]');
  }
  return str;
}

function getFormat(field: Record<string, unknown>, isUtc: boolean) {
  let inputType = 'datetime-local';
  let inputFormat = 'YYYY-MM-DDTHH:mm';
  let format = `YYYY-MM-DDTHH:mm:ss.SSS${isUtc ? '[Z]' : 'Z'}`;
  let userFormat = field.format as string | undefined;
  let dateFormat = field.date_format as string | boolean | undefined;
  let timeFormat = field.time_format as string | boolean | undefined;
  if (dateFormat === true) dateFormat = 'YYYY-MM-DD';
  if (timeFormat === true) timeFormat = 'HH:mm';

  if (isUtc) {
    if (typeof userFormat === 'string') userFormat = escapeZ(userFormat);
    if (typeof dateFormat === 'string') dateFormat = escapeZ(dateFormat);
    if (typeof timeFormat === 'string') timeFormat = escapeZ(timeFormat);
  }

  if (typeof dateFormat === 'string' && typeof timeFormat === 'string') {
    format = `${dateFormat}T${timeFormat}`;
  } else if (typeof timeFormat === 'string') {
    inputType = 'time';
    format = timeFormat;
  } else if (typeof dateFormat === 'string') {
    inputType = 'date';
    format = dateFormat;
  }

  if (typeof userFormat === 'string') {
    format = userFormat;
    inputType = 'datetime-local';
  }

  if (dateFormat === false) inputType = 'time';
  if (timeFormat === false) inputType = 'date';
  if (inputType === 'datetime-local') inputFormat = 'YYYY-MM-DDTHH:mm';
  if (inputType === 'date') inputFormat = 'YYYY-MM-DD';
  if (inputType === 'time') inputFormat = 'HH:mm';

  return { format, inputType, inputFormat };
}

export default function DateTimeControl({
  forID,
  field,
  value,
  classNameWrapper,
  setActiveStyle,
  setInactiveStyle,
  onChange,
  t,
  isDisabled = false,
  hasErrors,
  errorListId,
}: DateTimeControlProps) {
  const isUtc = (field.picker_utc as boolean) || false;

  function isValidDate(dt: string) {
    return dayjs(dt, getFormat(field, isUtc).inputFormat).isValid() || dt === '';
  }

  function getNow(): string {
    const { inputFormat } = getFormat(field, isUtc);
    return isUtc ? dayjs.utc().format(inputFormat) : dayjs().format(inputFormat);
  }

  function formatInputValue(v: string): string {
    if (v === '') return v;
    const { format, inputFormat } = getFormat(field, isUtc);

    const inputValue = isUtc
      ? dayjs.utc(v, format).format(inputFormat)
      : dayjs(v, format).format(inputFormat);

    if (isValidDate(inputValue)) {
      return inputValue;
    }
    return isUtc ? dayjs.utc(v).format(inputFormat) : dayjs(v).format(inputFormat);
  }

  function handleChange(datetime: string, fromDefault = false) {
    if (!isValidDate(datetime)) return;

    let formattedValue = '';
    if (datetime !== '') {
      const { format, inputFormat } = getFormat(field, isUtc);
      formattedValue = dayjs(datetime, inputFormat).format(format);
    }

    if (fromDefault) {
      onChange(formattedValue, { fromDefault: true });
    } else {
      onChange(formattedValue);
    }
  }

  // Read latest handleChange/getNow through a ref so the mount-only effect
  // reflects the {{now}} → current-time substitution without re-firing on
  // every render.
  const initRef = React.useRef({ value, handleChange, getNow });
  initRef.current = { value, handleChange, getNow };
  React.useEffect(() => {
    if (initRef.current.value === '{{now}}') {
      // This substitutes the framework-provided default; it is not a user
      // edit, so it's flagged via metadata so the draft reducer does not
      // mark a fresh entry as changed because of it (DCMS-416).
      initRef.current.handleChange(initRef.current.getNow(), true);
    }
  }, []);

  const { inputType } = getFormat(field, isUtc);

  return (
    <div
      className={classNameWrapper}
      css={css`
        display: flex !important;
        gap: 20px;
        align-items: center;
      `}
    >
      <input
        id={forID}
        data-testid={forID}
        type={inputType}
        value={value ? formatInputValue(value) : ''}
        onChange={e => handleChange(e.target.value)}
        onFocus={setActiveStyle as React.FocusEventHandler<HTMLInputElement>}
        onBlur={setInactiveStyle as React.FocusEventHandler<HTMLInputElement>}
        disabled={isDisabled}
        aria-required={field.required !== false}
        aria-invalid={hasErrors || undefined}
        aria-errormessage={hasErrors ? errorListId : undefined}
      />
      {isUtc && (
        <span
          css={css`
            font-size: 0.8em;
            color: #666;
          `}
        >
          UTC
        </span>
      )}
      {!isDisabled && (
        <Buttons
          t={t}
          fieldName={field.name as string}
          handleChange={handleChange}
          getNow={getNow}
        />
      )}
    </div>
  );
}
