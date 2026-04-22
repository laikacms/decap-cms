import React from 'react';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { translate } from 'react-polyglot';
import { ClassNames, Global, css as coreCss } from '@emotion/react';
import type { Interpolation, Theme } from '@emotion/react';
import styled from '@emotion/styled';
import partial from 'lodash/partial';
import uniqueId from 'lodash/uniqueId';
import memoize from 'lodash/memoize';
import { connect } from 'react-redux';
import { FieldLabel, colors, transitions, lengths, borders } from 'decap-cms-ui-default';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';

import type { Dispatch } from 'redux';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type {
  CmsCollectionObject,
  CmsEntryMap,
  CmsEntryField,
  CmsConfig,
} from 'decap-cms-lib-util/types/cms';

type Collection = CmsCollectionObject;
type EntryMap = CmsEntryMap;
type EntryField = CmsEntryField;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type State = any;
import type AssetProxy from '../../../valueObjects/AssetProxy';

import { resolveWidget, getEditorComponents } from '../../../lib/registry';
import { clearFieldErrors, tryLoadEntry, validateMetaField } from '../../../actions/entries';
import { addAsset, boundGetAsset } from '../../../actions/media';
import { selectIsLoadingAsset } from '../../../reducers/medias';
import { query, clearSearch } from '../../../actions/search';
import { store } from '../../../redux';
import {
  openMediaLibrary,
  removeInsertedMedia,
  clearMediaControl,
  removeMediaControl,
  persistMedia,
} from '../../../actions/mediaLibrary';
import Widget from './Widget';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WidgetComponent: React.ComponentType<any> = Widget;

/**
 * This is a necessary bridge as we are still passing classnames to widgets
 * for styling. Once that changes we can stop storing raw style strings like
 * this.
 */
const styleStrings = {
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
    color: #444a57;
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

function LabelComponent({ field, isActive, hasErrors, uniqueFieldId, isFieldOptional, t }: LabelComponentProps) {
  const label = `${(field as any).label || field.name}`;
  const labelComponent = (
    <FieldLabel isActive={isActive} hasErrors={hasErrors} htmlFor={uniqueFieldId}>
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
  query: (namespace: string, collectionName: string, searchFields: string[], searchTerm: string, file?: string, limit?: number) => void;
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

class EditorControl extends React.Component<EditorControlProps, EditorControlState> {
  static propTypes = {
    value: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.object,
      PropTypes.string,
      PropTypes.bool,
    ]),
    field: ImmutablePropTypes.map.isRequired,
    fieldsMetaData: ImmutablePropTypes.map,
    fieldsErrors: ImmutablePropTypes.map,
    mediaPaths: ImmutablePropTypes.map.isRequired,
    boundGetAsset: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    openMediaLibrary: PropTypes.func.isRequired,
    addAsset: PropTypes.func.isRequired,
    removeInsertedMedia: PropTypes.func.isRequired,
    persistMedia: PropTypes.func.isRequired,
    onValidate: PropTypes.func,
    controlRef: PropTypes.func,
    query: PropTypes.func.isRequired,
    queryHits: PropTypes.object,
    isFetching: PropTypes.bool,
    clearSearch: PropTypes.func.isRequired,
    clearFieldErrors: PropTypes.func.isRequired,
    loadEntry: PropTypes.func.isRequired,
    getEntry: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    isEditorComponent: PropTypes.bool,
    isNewEditorComponent: PropTypes.bool,
    parentIds: PropTypes.arrayOf(PropTypes.string),
    collection: ImmutablePropTypes.map.isRequired,
    isDisabled: PropTypes.bool,
    isHidden: PropTypes.bool,
    isFieldDuplicate: PropTypes.func,
    isFieldHidden: PropTypes.func,
    locale: PropTypes.string,
    isParentListCollapsed: PropTypes.bool,
  };

  static defaultProps = {
    parentIds: [],
  };

  state: EditorControlState = {
    activeLabel: false,
    styleActive: false,
  };

  uniqueFieldId = uniqueId(`${this.props.field.name}-field-`);

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(EditorControl.propTypes, this.props, 'prop', 'EditorControl');
  }

  isAncestorOfFieldError = () => {
    const { fieldsErrors } = this.props;

    if (fieldsErrors && Object.keys(fieldsErrors).length > 0) {
      return Object.values(fieldsErrors).some((arr: unknown) =>
        (arr as FieldError[]).some((err: FieldError) => err.parentIds && err.parentIds.includes(this.uniqueFieldId)),
      );
    }
    return false;
  };

  onChange = (newValue: unknown, newMetadata?: Record<string, unknown>) => {
    this.props.onChange(this.props.field, newValue, newMetadata);
    this.props.clearFieldErrors(this.uniqueFieldId); // We are deleting errors for this field only.
  };

  render() {
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
      parentIds,
      t,
      validateMetaField,
      isLoadingAsset,
      isDisabled,
      isHidden,
      isFieldDuplicate,
      isFieldHidden,
      locale,
      isParentListCollapsed,
    } = this.props;

    const widgetName = field.widget;
    const widget = resolveWidget(widgetName);
    const fieldName = field.name;
    const fieldHint = (field as any).hint as string | undefined;
    const isFieldOptional = (field as any).required === false;
    const onValidateObject = onValidate;
    const metadata = fieldsMetaData && fieldsMetaData[fieldName];
    const errors = fieldsErrors && fieldsErrors[this.uniqueFieldId];
    const childErrors = this.isAncestorOfFieldError();
    const hasErrors = !!errors || childErrors;

    return (
      <ClassNames>
        {({ css, cx }) => (
          <ControlContainer
            className={cx(className, isHidden && css`${styleStrings.hidden}`)}
            aria-label={t('editor.editorControl.field.widgetLabel', { widgetLabel: widgetName })}
          >
            <ControlTopbar>
              {widget.globalStyles ? <Global styles={coreCss`${widget.globalStyles as string}` as Interpolation<Theme>} /> : null}
              <LabelComponent
                field={field}
                isActive={!!(isSelected || this.state.styleActive)}
                hasErrors={hasErrors}
                uniqueFieldId={this.uniqueFieldId}
                isFieldOptional={isFieldOptional}
                t={t}
              />
              {errors && (
                <ControlErrorsList>
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
                  `]: isSelected || this.state.styleActive,
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
              entry={getEntry()} // This field has been deprecated and can contain stale data, do not use it in widgets
              collection={collection}
              config={config}
              field={field}
              uniqueFieldId={this.uniqueFieldId}
              value={value}
              mediaPaths={mediaPaths}
              metadata={metadata}
              onChange={this.onChange}
              onValidate={onValidate && ((errors: FieldError[]) => onValidate(this.uniqueFieldId, errors))}
              onOpenMediaLibrary={openMediaLibrary}
              onClearMediaControl={clearMediaControl}
              onRemoveMediaControl={removeMediaControl}
              onRemoveInsertedMedia={removeInsertedMedia}
              onPersistMedia={persistMedia}
              onAddAsset={addAsset}
              getAsset={boundGetAsset}
              hasActiveStyle={isSelected || this.state.styleActive}
              setActiveStyle={() => this.setState({ styleActive: true })}
              setInactiveStyle={() => this.setState({ styleActive: false })}
              resolveWidget={resolveWidget}
              widget={widget}
              getEditorComponents={getEditorComponents}
              controlRef={controlRef}
              editorControl={ConnectedEditorControl}
              query={query}
              loadEntry={loadEntry}
              getEntry={getEntry}
              queryHits={(queryHits || {})[this.uniqueFieldId] || []}
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
              <ControlHint active={isSelected || this.state.styleActive} error={hasErrors}>
                <ReactMarkdown
                  remarkPlugins={[gfm]}
                  allowedElements={['a', 'strong', 'em', 'del']}
                  unwrapDisallowed={true}
                  components={{
                    // eslint-disable-next-line no-unused-vars
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
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
      validateMetaField(state, collection, field, value, t);
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

function mapStateToProps(state: State) {
  const { collections, entryDraft } = state;
  const collection = collections[entryDraft.entry?.collection as string];
  const isLoadingAsset = selectIsLoadingAsset(state.medias);

  return {
    mediaPaths: state.mediaLibrary.controlMedia,
    isFetching: state.search.isFetching,
    queryHits: state.search.queryHits,
    config: state.config,
    collection,
    isLoadingAsset,
    getEntry: stable.getEntry,
    loadEntry: stable.loadEntry,
    validateMetaField: stable.validateMetaField(collection),
  };
}

function mapDispatchToProps(dispatch: Dispatch) {
  const creators = bindActionCreators(
    {
      openMediaLibrary,
      clearMediaControl,
      removeMediaControl,
      removeInsertedMedia,
      persistMedia,
      addAsset,
      query,
      clearSearch,
      clearFieldErrors,
    },
    dispatch,
  );
  return {
    ...creators,
    boundGetAsset: stable.getBoundedAsset,
  };
}

function mergeProps(
  stateProps: ReturnType<typeof mapStateToProps>,
  dispatchProps: ReturnType<typeof mapDispatchToProps>,
  ownProps: Record<string, unknown>,
) {
  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    boundGetAsset: dispatchProps.boundGetAsset(stateProps.collection, stateProps.getEntry()),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ConnectedEditorControl = (connect as any)(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(translate()(EditorControl));

export default ConnectedEditorControl;
