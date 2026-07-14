import React from 'react';
import { useTranslate } from 'react-polyglot';
import { ClassNames, Global, css as coreCss } from '@emotion/react';
import styled from '@emotion/styled';
import partial from 'lodash/partial';
import uniqueId from 'lodash/uniqueId';
import memoize from 'lodash/memoize';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';

import { FieldLabel, colors, transitions, lengths, borders } from '@/ui/default/index';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { resolveWidget, getEditorComponents } from '@/core/lib/registry';
import { clearFieldErrors, tryLoadEntry, validateMetaField } from '@/core/actions/entries';
import { addAsset, boundGetAsset } from '@/core/actions/media';
import { selectIsLoadingAsset } from '@/core/reducers/medias';
import { query, clearSearch } from '@/core/actions/search';
import { store } from '@/core/redux';
import {
  openMediaLibrary,
  removeInsertedMedia,
  clearMediaControl,
  removeMediaControl,
  persistMedia,
} from '@/core/actions/mediaLibrary';
import Widget from './Widget';

import type AssetProxy from '@/core/valueObjects/AssetProxy';
import type { Interpolation, Theme } from '@emotion/react';
import type { Dispatch } from 'redux';
import type { TranslateFunction } from '@/ui/default/index';
import type {
  CmsCollectionState,
  CmsEntry,
  CmsEntryField,
  CmsConfig,
} from '@/lib/util/index';

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

export const ControlHint = styled.p<{ active?: boolean; error?: boolean }>`
  margin-bottom: 0;
  padding: 6px 0 0;
  font-size: 12px;
  color: ${props =>
    props.error ? colors.errorText : props.active ? colors.active : colors.controlLabel};
  transition: color ${transitions.main};
`;

interface LabelComponentProps {
  field: EntryField;
  isActive: boolean;
  hasErrors: boolean;
  uniqueFieldId: string;
  isFieldOptional: boolean;
  t: TranslateFunction;
}

function LabelComponent({
  field,
  isActive,
  hasErrors,
  uniqueFieldId,
  isFieldOptional,
  t,
}: LabelComponentProps) {
  const label = `${(field as any).label || field.name}`;
  const labelComponent = (
    <FieldLabel $isActive={isActive} $hasErrors={hasErrors} htmlFor={uniqueFieldId}>
      {isFieldOptional ? (
        <>
          {label}
          <span>{` (${t('editor.editorControl.field.optional')})`}</span>
        </>
      ) : (
        label
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
        ),
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
  const isFieldOptional = (field as any).required === false;
  const onValidateObject = onValidate;
  const metadata = fieldsMetaData && fieldsMetaData[fieldName];
  const errors = fieldsErrors && fieldsErrors[uniqueFieldId];
  const childErrors = isAncestorOfFieldError();
  const hasErrors = !!errors || childErrors;

  return (
    <ClassNames>
      {({ css, cx }) => (
        <ControlContainer
          className={cx(
            className,
            isHidden &&
              css`
                ${styleStrings.hidden}
              `,
          )}
          aria-label={t('editor.editorControl.field.widgetLabel', { widgetLabel: widgetName })}
        >
          <ControlTopbar>
            {widget.globalStyles ? (
              <Global styles={coreCss`${widget.globalStyles as string}` as Interpolation<Theme>} />
            ) : null}
            <LabelComponent
              field={field}
              isActive={!!(isSelected || styleActive)}
              hasErrors={hasErrors}
              uniqueFieldId={uniqueFieldId}
              isFieldOptional={isFieldOptional}
              t={t}
            />
            {errors && (
              <ControlErrorsList className="ControlErrorsList">
                {errors.map(
                  (error: FieldError) =>
                    error.message &&
                    typeof error.message === 'string' && (
                      <li key={error.message.trim().replace(/[^a-z0-9]+/gi, '-')}>
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
                [css`
                  ${styleStrings.widgetActive};
                `]: isSelected || styleActive,
              },
              {
                [css`
                  ${styleStrings.widgetError};
                `]: hasErrors,
              },
              {
                [css`
                  ${styleStrings.disabled}
                `]: isDisabled,
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
            getEditorComponents={getEditorComponents}
            controlRef={controlRef}
            editorControl={ConnectedEditorControl}
            query={query}
            loadEntry={loadEntry}
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
            <ControlHint active={isSelected || styleActive} error={hasErrors}>
              <ReactMarkdown
                remarkPlugins={[gfm]}
                allowedElements={['a', 'strong', 'em', 'del']}
                unwrapDisallowed={true}
                components={{
                  a: ({ node, ...rest }) => (
                    <a
                      {...rest}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit' }}
                    />
                  ),
                }}
              >
                {fieldHint}
              </ReactMarkdown>
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
  locale?: string;
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
      clearFieldErrors={(fieldId: string | undefined) =>
        dispatch(clearFieldErrors(fieldId as string))
      }
      t={t}
    />
  );
  return inner;
}
