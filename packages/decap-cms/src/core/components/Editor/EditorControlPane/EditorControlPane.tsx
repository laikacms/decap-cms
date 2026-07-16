import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { memoize } from 'lodash-es';
import React from 'react';

import {
  getI18nInfo,
  getLocaleDataPath,
  hasI18n,
  isFieldDuplicate,
  isFieldHidden,
  isFieldTranslatable,
} from '@/core/lib/i18n';
import { buttons, colors, Dropdown, DropdownItem, StyledDropdownButton, text } from '@/ui/default/index';
import EditorControl from './EditorControl';

import type { I18nInfo } from '@/core/lib/i18n';
import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@/lib/util/index';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;

const ControlPaneContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 16px;
  font-size: 16px;
`;

const LocaleButton = styled(StyledDropdownButton)`
  ${buttons.button};
  ${buttons.medium};
  color: ${colors.controlLabel};
  background: ${colors.textFieldBorder};
  height: 100%;

  &:after {
    top: 11px;
  }
`;

const LocaleButtonWrapper = styled.div`
  display: flex;
`;

const LocaleRowWrapper = styled.div`
  display: flex;
`;

const StyledDropdown = styled(Dropdown)`
  width: max-content;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 20px;
`;

interface LocaleDropdownProps {
  locales: string[];
  dropdownText: string;
  onLocaleChange: (locale: string) => void;
}

function LocaleDropdown({ locales, dropdownText, onLocaleChange }: LocaleDropdownProps) {
  return (
    <StyledDropdown
      renderButton={() => {
        return (
          <LocaleButtonWrapper>
            <LocaleButton>{dropdownText}</LocaleButton>
          </LocaleButtonWrapper>
        );
      }}
    >
      {locales.map((l: string) => <DropdownItem key={l} label={l} onClick={() => onLocaleChange(l)} />)}
    </StyledDropdown>
  );
}

interface GetFieldValueParams {
  field: EntryField;
  entry: EntryMap;
  isTranslatable: boolean;
  locale: string;
}

function getFieldValue({ field, entry, isTranslatable, locale }: GetFieldValueParams) {
  if (field.meta) {
    return (entry.meta as Record<string, unknown>)?.[field.name];
  }

  if (isTranslatable) {
    const dataPath = getLocaleDataPath(locale);
    // Navigate the entry using the locale data path
    let current: any = entry;
    for (const key of dataPath) {
      current = current?.[key];
    }
    return current?.[field.name];
  }

  return (entry.data as Record<string, unknown>)?.[field.name];
}

interface ControlPaneProps {
  collection: Collection;
  entry: EntryMap;
  fields: EntryField[];
  fieldsMetaData: Record<string, Record<string, unknown>>;
  fieldsErrors: Record<string, { type: string, message: string }[]>;
  onChange: (
    field: EntryField,
    value: unknown,
    metadata?: Record<string, unknown>,
    i18n?: unknown,
  ) => void;
  onValidate: (fieldName: string, errors: { type: string, message: string }[]) => void;
  onLocaleChange?: (locale: string) => void;
  locale?: string;
  t: (key: string, options?: Record<string, string>) => string;
}

export interface ControlPaneHandle {
  focus(path: string): void;
  validate(): void;
  switchToDefaultLocale(): Promise<void>;
}

const ControlPane = React.forwardRef<ControlPaneHandle, ControlPaneProps>(
  function ControlPane(props, ref) {
    const { collection, entry, fields, fieldsMetaData, fieldsErrors, onValidate, t } = props;

    const [selectedLocale, setSelectedLocale] = React.useState<string | undefined>(props.locale);
    const childRefs = React.useRef<Record<string, unknown>>({});

    function controlRef(field: EntryField, wrappedControl: unknown) {
      if (!wrappedControl) return;
      childRefs.current[field.name] = wrappedControl;
    }

    // Memoize per-field ref callbacks so EditorControl doesn't see a new ref
    // function on every render.
    const getControlRef = React.useMemo(
      () =>
        memoize((field: EntryField) => (wrappedControl: unknown) => {
          controlRef(field, wrappedControl);
        }),
      [],
    );

    function handleLocaleChange(val: string) {
      setSelectedLocale(val);
      props.onLocaleChange?.(val);
    }

    const copyFromOtherLocale = ({
      targetLocale,
      t: tt,
    }: {
      targetLocale: string,
      t: (key: string, options?: Record<string, string>) => string,
    }) =>
    (sourceLocale: string) => {
      if (
        !window.confirm(
          tt('editor.editorControlPane.i18n.copyFromLocaleConfirm', {
            locale: sourceLocale.toUpperCase(),
          }),
        )
      ) {
        return;
      }
      const { locales, defaultLocale } = getI18nInfo(collection) as I18nInfo;

      const i18n = locales && {
        currentLocale: selectedLocale,
        locales,
        defaultLocale,
      };

      props.fields.forEach(field => {
        if (field && isFieldTranslatable(field, targetLocale, sourceLocale)) {
          const copyValue = getFieldValue({
            field,
            entry,
            locale: sourceLocale,
            isTranslatable: sourceLocale !== defaultLocale,
          });
          if (copyValue) props.onChange(field, copyValue, undefined, i18n);
        }
      });
    };

    React.useImperativeHandle(
      ref,
      () => ({
        focus(path: string) {
          const [fieldName, ...remainingPath] = path.split('.');
          const control = childRefs.current[fieldName] as Record<string, unknown> | undefined;
          if (control?.focus) {
            (control.focus as (p: string) => void)(remainingPath.join('.'));
          }
        },
        validate() {
          props.fields.forEach(field => {
            if (!field) return;
            if (field.widget === 'hidden') return;
            const control = childRefs.current[field.name] as Record<string, unknown> | undefined;
            const innerWrappedControl = control?.innerWrappedControl as
              | Record<string, unknown>
              | undefined;
            const validateFn = (innerWrappedControl?.validate ?? control?.validate) as
              | (() => void)
              | undefined;
            validateFn?.();
          });
        },
        switchToDefaultLocale() {
          if (hasI18n(collection)) {
            const { defaultLocale } = getI18nInfo(collection) as I18nInfo;
            setSelectedLocale(defaultLocale);
          }
          return Promise.resolve();
        },
      }),
      // The handle is recreated when props.fields/collection change so the
      // closures see fresh values.
      [props.fields, collection],
    );

    function getI18n() {
      const { locales, defaultLocale } = getI18nInfo(collection) as I18nInfo;
      return (
        locales && {
          currentLocale: selectedLocale,
          locales,
          defaultLocale,
        }
      );
    }

    function onChange(
      field: EntryField,
      newValue: unknown,
      newMetadata: Record<string, unknown> | undefined,
    ) {
      props.onChange(field, newValue, newMetadata, getI18n());
    }

    function isFieldDuplicateForLocale(field: EntryField) {
      const { defaultLocale } = getI18nInfo(collection) as I18nInfo;
      return isFieldDuplicate(field, selectedLocale ?? '', defaultLocale);
    }

    function isFieldHiddenForLocale(field: EntryField) {
      const { defaultLocale } = getI18nInfo(collection) as I18nInfo;
      return isFieldHidden(field, selectedLocale ?? '', defaultLocale);
    }

    if (!collection || !fields) return null;
    if (entry.isFetching === true) return null;

    const { locales, defaultLocale } = getI18nInfo(collection) as I18nInfo;
    const locale = selectedLocale;
    const i18n = locales && {
      currentLocale: locale,
      locales,
      defaultLocale,
    };

    return (
      <ControlPaneContainer>
        {locales && (
          <LocaleRowWrapper>
            <LocaleDropdown
              locales={locales}
              dropdownText={t('editor.editorControlPane.i18n.writingInLocale', {
                locale: (locale ?? '').toUpperCase(),
              })}
              onLocaleChange={handleLocaleChange}
            />
            <LocaleDropdown
              locales={locales.filter((l: string) => l !== locale)}
              dropdownText={t('editor.editorControlPane.i18n.copyFromLocale')}
              onLocaleChange={copyFromOtherLocale({ targetLocale: locale ?? '', t })}
            />
          </LocaleRowWrapper>
        )}
        {fields
          .filter(f => f.widget !== 'hidden')
          .map((field, i) => {
            const isTranslatable = isFieldTranslatable(field, locale ?? '', defaultLocale);
            const isDuplicate = isFieldDuplicate(field, locale ?? '', defaultLocale);
            const isHidden = isFieldHidden(field, locale ?? '', defaultLocale);
            const key = i18n ? `${locale}_${i}` : i;

            return (
              <EditorControl
                key={key}
                field={field}
                value={getFieldValue({ field, entry, locale: locale ?? '', isTranslatable })}
                fieldsMetaData={fieldsMetaData}
                fieldsErrors={fieldsErrors}
                onChange={onChange}
                onValidate={onValidate}
                controlRef={getControlRef(field)}
                // entry={entry} For compatibility with existing controls, we pass the (stale) entry down to the widget.
                collection={collection}
                isDisabled={isDuplicate}
                isHidden={isHidden}
                isFieldDuplicate={isFieldDuplicateForLocale}
                isFieldHidden={isFieldHiddenForLocale}
                locale={locale}
              />
            );
          })}
      </ControlPaneContainer>
    );
  },
);

export default ControlPane;
