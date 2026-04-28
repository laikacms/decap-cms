import React from 'react';
import memoize from 'lodash/memoize';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import {
  buttons,
  colors,
  Dropdown,
  DropdownItem,
  StyledDropdownButton,
  text,
} from 'decap-cms-ui-default';

import type {
  CmsCollectionState,
  CmsEntry,
  CmsEntryField,
} from 'decap-cms-lib-util/types/cms';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;
import type { I18nInfo } from '../../../lib/i18n';

import EditorControl from './EditorControl';
import {
  getI18nInfo,
  getLocaleDataPath,
  hasI18n,
  isFieldDuplicate,
  isFieldHidden,
  isFieldTranslatable,
} from '../../../lib/i18n';

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
      {locales.map((l: string) => (
        <DropdownItem
          key={l}
          label={l}
          onClick={() => onLocaleChange(l)}
        />
      ))}
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
  fieldsErrors: Record<string, { type: string; message: string }[]>;
  onChange: (field: EntryField, value: unknown, metadata?: Record<string, unknown>, i18n?: unknown) => void;
  onValidate: (fieldName: string, errors: { type: string; message: string }[]) => void;
  onLocaleChange?: (locale: string) => void;
  locale?: string;
  t: (key: string, options?: Record<string, string>) => string;
}

interface ControlPaneState {
  selectedLocale: string | undefined;
}

export default class ControlPane extends React.Component<ControlPaneProps, ControlPaneState> {
  state: ControlPaneState = {
    selectedLocale: this.props.locale,
  };

  childRefs: Record<string, unknown> = {};

  controlRef = (field: EntryField, wrappedControl: unknown) => {
    if (!wrappedControl) return;
    const name = field.name;
    this.childRefs[name] = wrappedControl;
  };

  getControlRef = memoize((field: EntryField) => (wrappedControl: unknown) => {
    this.controlRef(field, wrappedControl);
  });

  handleLocaleChange = (val: string) => {
    this.setState({ selectedLocale: val });
    this.props.onLocaleChange?.(val);
  };

  copyFromOtherLocale =
    ({ targetLocale, t }: { targetLocale: string; t: (key: string, options?: Record<string, string>) => string }) =>
    (sourceLocale: string) => {
      if (
        !window.confirm(
          t('editor.editorControlPane.i18n.copyFromLocaleConfirm', {
            locale: sourceLocale.toUpperCase(),
          }),
        )
      ) {
        return;
      }
      const { entry, collection } = this.props;
      const { locales, defaultLocale } = getI18nInfo(collection) as I18nInfo;

      const locale = this.state.selectedLocale;
      const i18n = locales && {
        currentLocale: locale,
        locales,
        defaultLocale,
      };

      this.props.fields.forEach(field => {
        if (field && isFieldTranslatable(field, targetLocale, sourceLocale)) {
          const copyValue = getFieldValue({
            field,
            entry,
            locale: sourceLocale,
            isTranslatable: sourceLocale !== defaultLocale,
          });
          if (copyValue) this.props.onChange(field, copyValue, undefined, i18n);
        }
      });
    };

  validate = async () => {
    this.props.fields.forEach(field => {
      if (!field) return;
      if (field.widget === 'hidden') return;
      const name = field.name;
      const control = this.childRefs[name] as Record<string, unknown> | undefined;
      const innerWrappedControl = control?.innerWrappedControl as Record<string, unknown> | undefined;
      const validateFn = (innerWrappedControl?.validate ?? control?.validate) as (() => void) | undefined;
      if (validateFn) {
        validateFn();
      }
    });
  };

  switchToDefaultLocale = () => {
    if (hasI18n(this.props.collection)) {
      const { defaultLocale } = getI18nInfo(this.props.collection) as I18nInfo;
      return new Promise<void>(resolve => this.setState({ selectedLocale: defaultLocale }, resolve));
    } else {
      return Promise.resolve();
    }
  };

  focus(path: string) {
    const [fieldName, ...remainingPath] = path.split('.');
    const control = this.childRefs[fieldName] as Record<string, unknown> | undefined;
    if (control?.focus) {
      (control.focus as (path: string) => void)(remainingPath.join('.'));
    }
  }

  getI18n() {
    const { collection } = this.props;
    const { locales, defaultLocale } = getI18nInfo(collection) as I18nInfo;
    const locale = this.state.selectedLocale;
    return (
      locales && {
        currentLocale: locale,
        locales,
        defaultLocale,
      }
    );
  }

  onChange = (field: EntryField, newValue: unknown, newMetadata: Record<string, unknown> | undefined) => {
    this.props.onChange(field, newValue, newMetadata, this.getI18n());
  };

  isFieldDuplicate = (field: EntryField) => {
    const locale = this.state.selectedLocale;
    const { defaultLocale } = getI18nInfo(this.props.collection) as I18nInfo;
    return isFieldDuplicate(field, locale ?? '', defaultLocale);
  };

  isFieldHidden = (field: EntryField) => {
    const locale = this.state.selectedLocale;
    const { defaultLocale } = getI18nInfo(this.props.collection) as I18nInfo;
    return isFieldHidden(field, locale ?? '', defaultLocale);
  };

  render() {
    const { collection, entry, fields, fieldsMetaData, fieldsErrors, onValidate, t } = this.props;

    if (!collection || !fields) {
      return null;
    }

    if (entry.isFetching === true) {
      return null;
    }

    const { locales, defaultLocale } = getI18nInfo(collection) as I18nInfo;
    const locale = this.state.selectedLocale;
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
              onLocaleChange={this.handleLocaleChange}
            />
            <LocaleDropdown
              locales={locales.filter((l: string) => l !== locale)}
              dropdownText={t('editor.editorControlPane.i18n.copyFromLocale')}
              onLocaleChange={this.copyFromOtherLocale({ targetLocale: locale ?? '', t })}
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
                value={getFieldValue({
                  field,
                  entry,
                  locale: locale ?? '',
                  isTranslatable,
                })}
                fieldsMetaData={fieldsMetaData}
                fieldsErrors={fieldsErrors}
                onChange={this.onChange}
                onValidate={onValidate}
                controlRef={this.getControlRef(field)}
                // entry={entry} For compatibility with existing controls, we pass the (stale) entry down to the widget.
                collection={collection}
                isDisabled={isDuplicate}
                isHidden={isHidden}
                isFieldDuplicate={this.isFieldDuplicate}
                isFieldHidden={this.isFieldHidden}
                locale={locale}
              />
            );
          })}
      </ControlPaneContainer>
    );
  }
}
