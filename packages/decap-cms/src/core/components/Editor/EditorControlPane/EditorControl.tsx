import { ClassNames, css as coreCss, Global } from '@emotion/react';
import styled from '@emotion/styled';
import { memoize, partial, uniqueId } from 'lodash-es';
import React from 'react';

import {
  clearFieldErrors,
  persistQuickCreateEntry,
  tryLoadEntry,
  validateMetaField,
} from '@/core/actions/entries';
import { addAsset, boundGetAsset } from '@/core/actions/media';
import {
  clearMediaControl,
  openMediaLibrary,
  persistMedia,
  removeInsertedMedia,
  removeMediaControl,
} from '@/core/actions/mediaLibrary';
import { clearSearch, query } from '@/core/actions/search';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useTranslate } from '@/core/i18n';
import { resolveWidget } from '@/core/lib/registry';
import { selectIsLoadingAsset } from '@/core/reducers/medias';
import { store } from '@/core/redux';
import { borders, colors, FieldLabel, lengths, transitions } from '@/ui/default/index';
import HintMarkdown from './HintMarkdown';
import Widget from './Widget';

import type AssetProxy from '@/core/valueObjects/AssetProxy';
import type { CmsCollectionState, CmsConfig, CmsEntry, CmsEntryField } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';
import type { Interpolation, Theme } from '@emotion/react';
import type { Dispatch } from 'redux';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;

type State = any;

const WidgetComponent: React.ComponentType<any> = Widget;

/**
 * This is a necessary bridge as we are still passing classnames to widgets
 * for styling. Once that changes we can stop storing raw style strings like
 * this.
 */
export const styleStrings = {
  widget: `
    display: block;
    width: 100%;
    padding: ${lengths.inputPadding};
    margin: 0;
    border: ${borders.textField};
    border-radius: ${lengths.borderRadius};
    border-top-left-radius: 0;
    outline: 0;
    box-shadow: none;
    background-color: ${colors.inputBackground};
    color: ${colors.textLead};
    transition: border-color ${transitions.main};
    position: relative;
    font-size: 15px;
    line-height: 1.5;

    select& {
      text-indent: 14px;
      height: 58px;
    }
  `,
  widgetActive: `
    border-color: ${colors.active};
  `,
  widgetError: `
    border-color: ${colors.errorText};
  `,
  disabled: `
    pointer-events: none;
    opacity: 0.5;
  `,
  hidden: `
    visibility: hidden;
  `,
  label: ``,
  labelActive: ``,
};

const ControlContainer = styled.div`
  margin-top: 16px;

  &:first-of-type {
    margin-top: 36px;
  }
`;

const ControlTopbar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: end;
`;
const ControlErrorsList = styled.ul`
  list-style-type: none;
  font-size: 12px;
  color: ${colors.errorText};
  text-align: right;
  text-transform: uppercase;
  font-weight: 600;
  margin: 0;
  padding: 2px 0 3px;
`;

export const ControlHint = styled.p<{ active?: boolean, error?: boolean }>`
  margin-bottom: 0;
  padding: 6px 0 0;
  font-size: 12px;
  color: ${props => props.error ? colors.errorText : props.active ? colors.active : colors.controlLabel};
  transition: color ${transitions.main};
`;

const RequiredFieldMarker = styled.span`
  color: ${colors.errorText};
  margin-left: 2px;
`;

interface LabelComponentProps {
  field: EntryField;
  isActive: boolean;
  hasErrors: boolean;
  uniqueFieldId: string;
  isFieldRequired: boolean;
  t: TranslateFunction;
}

export function LabelComponent({
  field,
  isActive,
  hasErrors,
  uniqueFieldId,
  isFieldRequired,
  t,
}: LabelComponentProps) {
  const label = `${(field as any).label || field.name}`;
  const labelComponent = (
    <FieldLabel $isActive={isActive} $hasErrors={hasErrors} htmlFor={uniqueFieldId}>
      {label}
      {isFieldRequired && (
        <RequiredFieldMarker aria-hidden="true" title={t('editor.editorControl.field.required')}>
          {' *'}
        </RequiredFieldMarker>
      )}
    </FieldLabel>
  );

  return labelComponent;
}

interface FieldError {
  type: string;
  message: string;
  parentIds?: string[];
}

interface EditorControlProps {
  value?: React.ReactNode | Record<string, unknown> | string | boolean;
  field: EntryField;
  fieldsMetaData?: Record<string, Record<string, unknown>>;
  fieldsErrors?: Record<string, FieldError[]>;
  mediaPaths: Record<string, string>;
  boundGetAsset: (path: string, field: EntryField) => AssetProxy;
  onChange: (field: EntryField, value: unknown, metadata?: Record<string, unknown>) => void;
  openMediaLibrary: (options: Record<string, unknown>) => void;
  addAsset: (asset: AssetProxy) => void;
  removeInsertedMedia: (controlID: string) => void;
  persistMedia: (file: File) => void;
  onValidate?: (field: EntryField | string, errors: FieldError[]) => void;
  controlRef?: (field: EntryField, wrappedControl: React.Component | null) => void;
  query: (
    namespace: string,
    collectionName: string,
    searchFields: string[],
    searchTerm: string,
    file?: string,
    limit?: number,
  ) => void;
  queryHits?: Record<string, unknown>;
  isFetching?: boolean;
  clearSearch: () => void;
  clearFieldErrors: (uniqueFieldId: string) => void;
  loadEntry: (collectionName: string, slug: string) => Promise<EntryMap>;
  onQuickCreateEntry?: (
    collectionName: string,
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  getEntry: () => EntryMap;
  t: TranslateFunction;
  isEditorComponent?: boolean;
  isNewEditorComponent?: boolean;
  parentIds?: string[];
  collection: Collection;
  config: CmsConfig;
  isDisabled?: boolean;
  isHidden?: boolean;
  isFieldDuplicate?: (field: EntryField) => boolean;
  isFieldHidden?: (field: EntryField) => boolean;
  locale?: string;
  isParentListCollapsed?: boolean;
  clearMediaControl: (controlID: string) => void;
  removeMediaControl: (controlID: string) => void;
  className?: string;
  isSelected?: boolean;
  validateMetaField: (field: EntryField, value: string | undefined, t: TranslateFunction) => void;
  isLoadingAsset?: boolean;
}

interface EditorControlState {
  activeLabel: boolean;
  styleActive: boolean;
}

function EditorControl(props: EditorControlProps) {
  const {
    value,
    getEntry,
    collection,
    config,
    field,
    fieldsMetaData,
    fieldsErrors,
    mediaPaths,
    boundGetAsset,
    openMediaLibrary,
    clearMediaControl,
    removeMediaControl,
    addAsset,
    removeInsertedMedia,
    persistMedia,
    onValidate,
    controlRef,
    query,
    queryHits,
    isFetching,
    clearSearch,
    clearFieldErrors,
    loadEntry,
    onQuickCreateEntry,
    className,
    isSelected,
    isEditorComponent,
    isNewEditorComponent,
    parentIds = [],
    t,
    validateMetaField,
    isLoadingAsset,
    isDisabled,
    isHidden,
    isFieldDuplicate,
    isFieldHidden,
    locale,
    isParentListCollapsed,
  } = props;

  const [styleActive, setStyleActive] = React.useState(false);
  const uniqueFieldIdRef = React.useRef<string>('');
  if (!uniqueFieldIdRef.current) {
    uniqueFieldIdRef.current = uniqueId(`${field.name}-field-`);
  }
  const uniqueFieldId = uniqueFieldIdRef.current;

  function isAncestorOfFieldError() {
    if (fieldsErrors && Object.keys(fieldsErrors).length > 0) {
      return Object.values(fieldsErrors).some((arr: unknown) =>
        (arr as FieldError[]).some(
          (err: FieldError) => err.parentIds && err.parentIds.includes(uniqueFieldId),
        )
      );
    }
    return false;
  }

  function onChange(newValue: unknown, newMetadata?: Record<string, unknown>) {
    props.onChange(field, newValue, newMetadata);
    clearFieldErrors(uniqueFieldId);
  }

  const widgetName = field.widget;
  const widget = resolveWidget(widgetName);
  const fieldName = field.name;
  const fieldHint = (field as any).hint as string | undefined;
  const isFieldRequired = (field as any).required !== false;
  const onValidateObject = onValidate;
  const metadata = fieldsMetaData && fieldsMetaData[fieldName];
  const errors = fieldsErrors && fieldsErrors[uniqueFieldId];
  const childErrors = isAncestorOfFieldError();
  const hasErrors = !!errors || childErrors;
  // Stable id for the <ul.ControlErrorsList>, so the widget input can point
  // its `aria-errormessage` at it (WCAG 2.1 3.3.1 / 3.3.3). Only meaningful
  // while this field actually has its own errors (not inherited from a
  // descendant), matching the `errors && <ControlErrorsList>` render guard
  // below.
  const errorListId = errors ? `${uniqueFieldId}-errors` : undefined;
  // Stable id for the <ControlHint>, so the widget input can point its
  // `aria-describedby` at it (WCAG 2.1 1.3.1 / 3.3.2). Only meaningful while
  // the field actually has a hint, matching the `fieldHint && <ControlHint>`
  // render guard below.
  const hintId = fieldHint ? `${uniqueFieldId}-hint` : undefined;

  return (
    <ClassNames>
      {({ css, cx }) => (
        <ControlContainer
          className={cx(
            className,
            isHidden
              && css`
                ${styleStrings.hidden}
              `,
          )}
          aria-label={t('editor.editorControl.field.widgetLabel', { widgetLabel: widgetName })}
          data-field-name={field.name}
        >
          <ControlTopbar>
            {widget.globalStyles
              ? <Global styles={coreCss`${widget.globalStyles as string}` as Interpolation<Theme>} />
              : null}
            <LabelComponent
              field={field}
              isActive={!!(isSelected || styleActive)}
              hasErrors={hasErrors}
              uniqueFieldId={uniqueFieldId}
              isFieldRequired={isFieldRequired}
              t={t}
            />
            {errors && (
              <ControlErrorsList id={errorListId} className="ControlErrorsList">
                {errors.map(
                  (error: FieldError, index: number) =>
                    error.message
                    && typeof error.message === 'string' && (
                      <li key={error.message.trim().replace(/[^a-z0-9]+/gi, '-')} id={`${errorListId}-${index}`}>
                        {error.message}
                      </li>
                    ),
                )}
              </ControlErrorsList>
            )}
          </ControlTopbar>
          <WidgetComponent
            classNameWrapper={cx(
              css`
                ${styleStrings.widget};
              `,
              {
                [
                  css`
                  ${styleStrings.widgetActive};
                `
                ]: isSelected || styleActive,
              },
              {
                [
                  css`
                  ${styleStrings.widgetError};
                `
                ]: hasErrors,
              },
              {
                [
                  css`
                  ${styleStrings.disabled}
                `
                ]: isDisabled,
              },
            )}
            classNameWidget={css`
              ${styleStrings.widget};
            `}
            classNameWidgetActive={css`
              ${styleStrings.widgetActive};
            `}
            classNameLabel={css`
              ${styleStrings.label};
            `}
            classNameLabelActive={css`
              ${styleStrings.labelActive};
            `}
            controlComponent={widget.control}
            entry={getEntry()} // Deprecated; can contain stale data
            collection={collection}
            config={config}
            field={field}
            uniqueFieldId={uniqueFieldId}
            hasErrors={hasErrors}
            errorListId={errorListId}
            hintId={hintId}
            value={value}
            mediaPaths={mediaPaths}
            metadata={metadata}
            onChange={onChange}
            onValidate={onValidate && ((errs: FieldError[]) => onValidate(uniqueFieldId, errs))}
            onOpenMediaLibrary={openMediaLibrary}
            onClearMediaControl={clearMediaControl}
            onRemoveMediaControl={removeMediaControl}
            onRemoveInsertedMedia={removeInsertedMedia}
            onPersistMedia={persistMedia}
            onAddAsset={addAsset}
            getAsset={boundGetAsset}
            hasActiveStyle={isSelected || styleActive}
            setActiveStyle={() => setStyleActive(true)}
            setInactiveStyle={() => setStyleActive(false)}
            resolveWidget={resolveWidget}
            widget={widget}
            controlRef={controlRef}
            editorControl={ConnectedEditorControl}
            query={query}
            loadEntry={loadEntry}
            onQuickCreateEntry={onQuickCreateEntry}
            getEntry={getEntry}
            queryHits={(queryHits || {})[uniqueFieldId] || []}
            clearSearch={clearSearch}
            clearFieldErrors={clearFieldErrors}
            isFetching={isFetching}
            fieldsErrors={fieldsErrors}
            onValidateObject={onValidateObject}
            isEditorComponent={isEditorComponent}
            isNewEditorComponent={isNewEditorComponent}
            parentIds={parentIds}
            t={t}
            validateMetaField={validateMetaField}
            isDisabled={isDisabled}
            isFieldDuplicate={isFieldDuplicate}
            isFieldHidden={isFieldHidden}
            isLoadingAsset={isLoadingAsset}
            locale={locale}
            isParentListCollapsed={isParentListCollapsed}
          />
          {fieldHint && (
            <ControlHint id={hintId} active={isSelected || styleActive} error={hasErrors}>
              <HintMarkdown source={fieldHint} />
            </ControlHint>
          )}
        </ControlContainer>
      )}
    </ClassNames>
  );
}

const stable = {
  loadEntry: async function stable_loadEntry(collectionName: string, slug: string) {
    const state = store.getState() as State;
    const { collections } = state;
    const targetCollection = collections[collectionName];
    if (targetCollection) {
      const loadedEntry = await tryLoadEntry(state, targetCollection, slug);
      return loadedEntry;
    } else {
      throw new Error(`Can't find collection '${collectionName}'`);
    }
  },

  quickCreateEntry: async function stable_quickCreateEntry(
    collectionName: string,
    data: Record<string, unknown>,
  ) {
    const state = store.getState() as State;
    const { collections } = state;
    const targetCollection = collections[collectionName];
    if (!targetCollection) {
      throw new Error(`Can't find collection '${collectionName}'`);
    }
    return store.dispatch(persistQuickCreateEntry(targetCollection, data) as never) as unknown as Promise<
      Record<string, unknown>
    >;
  },

  // Will return the same function instance for the same collection.
  validateMetaField: memoize((collection: Collection) => {
    return (field: EntryField, value: string | undefined, t: TranslateFunction) => {
      const state = store.getState() as State;
      return validateMetaField(state, collection, field, value, t);
    };
  }),

  getEntry() {
    const state = store.getState() as State;
    return state.entryDraft.entry;
  },

  getBoundedAsset(collection: Collection, entry: EntryMap) {
    const dispatch = store.dispatch;
    return boundGetAsset(dispatch as never, collection, entry);
  },
};

interface ConnectedEditorControlProps {
  field: EntryField;
  value: unknown;
  fieldsMetaData: Record<string, unknown>;
  fieldsErrors: Record<string, FieldError[]>;
  onChange: (field: EntryField, value: unknown, metadata?: Record<string, unknown>) => void;
  onValidate: (uniqueFieldId: string, errors: FieldError[]) => void;
  controlRef?: (ref: unknown) => void;
  collection?: Collection;
  isDisabled?: boolean;
  isHidden?: boolean;
  isFieldDuplicate?: (field: EntryField) => boolean;
  isFieldHidden?: (field: EntryField) => boolean;
  locale?: string | undefined;
  isParentListCollapsed?: boolean;
  className?: string;
  isSelected?: boolean;
  isEditorComponent?: boolean;
  isNewEditorComponent?: boolean;
  parentIds?: string[];
}

export default function ConnectedEditorControl(props: ConnectedEditorControlProps) {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const stateCollection = useAppSelector(
    (state: any) => state.collections[state.entryDraft.entry?.collection as string],
  );
  const collection = (props.collection ?? stateCollection) as Collection;
  const mediaPaths = useAppSelector((state: any) => state.mediaLibrary.controlMedia);
  const isFetching = useAppSelector((state: any) => state.search.isFetching);
  const queryHits = useAppSelector((state: any) => state.search.queryHits);
  const config = useAppSelector((state: any) => state.config);
  const isLoadingAsset = useAppSelector((state: any) => selectIsLoadingAsset(state.medias));

  const validateMetaFieldFn = React.useMemo(
    () => stable.validateMetaField(collection),
    [collection],
  );
  const boundGetAssetForEntry = React.useMemo(
    () => stable.getBoundedAsset(collection, stable.getEntry()),
    // recompute when collection changes; entry is read live via stable.getEntry on each call

    [collection],
  );

  const inner = (
    <EditorControl
      {...(props as any)}
      collection={collection}
      mediaPaths={mediaPaths}
      isFetching={isFetching}
      queryHits={queryHits}
      config={config}
      isLoadingAsset={isLoadingAsset}
      getEntry={stable.getEntry}
      loadEntry={stable.loadEntry}
      onQuickCreateEntry={stable.quickCreateEntry}
      validateMetaField={validateMetaFieldFn}
      boundGetAsset={boundGetAssetForEntry}
      openMediaLibrary={(opts: any) => dispatch(openMediaLibrary(opts))}
      clearMediaControl={(controlID: string) => dispatch(clearMediaControl(controlID))}
      removeMediaControl={(controlID: string) => dispatch(removeMediaControl(controlID))}
      removeInsertedMedia={(controlID: string) => dispatch(removeInsertedMedia(controlID))}
      persistMedia={(file: File, opts?: any) => dispatch(persistMedia(file, opts))}
      addAsset={(asset: unknown) => dispatch(addAsset(asset as any))}
      query={(...args: unknown[]) => dispatch((query as any)(...args))}
      clearSearch={() => dispatch(clearSearch())}
      clearFieldErrors={(fieldId: string | undefined) => dispatch(clearFieldErrors(fieldId as string))}
      t={t}
    />
  );
  return inner;
}
