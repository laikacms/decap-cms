import React from 'react';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { translate } from 'react-polyglot';
import { ClassNames, Global, css as coreCss } from '@emotion/react';
import styled from '@emotion/styled';
import partial from 'lodash/partial';
import uniqueId from 'lodash/uniqueId';
import { connect } from 'react-redux';
import { FieldLabel, colors, transitions, lengths, borders } from 'decap-cms-ui-default';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';

import { resolveWidget, getEditorComponents } from '../../../lib/registry';
import {
  clearFieldErrors,
  tryLoadEntry,
  validateMetaField as validateMetaFieldAction,
  persistQuickCreateEntry,
} from '../../../actions/entries';
import { addAsset, boundGetAsset } from '../../../actions/media';
import { selectIsLoadingAsset } from '../../../reducers/medias';
import { query, clearSearch } from '../../../actions/search';
import {
  openMediaLibrary,
  removeInsertedMedia,
  clearMediaControl,
  removeMediaControl,
  persistMedia,
} from '../../../actions/mediaLibrary';
import Widget from './Widget';

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
    color: ${colors.text};
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

export const ControlHint = styled.p`
  margin-bottom: 0;
  padding: 6px 0 0;
  font-size: 12px;
  color: ${props =>
    props.error ? colors.errorText : props.active ? colors.active : colors.controlLabel};
  transition: color ${transitions.main};
`;

const RequiredFieldMarker = styled.span`
  color: ${colors.errorText};
  margin-left: 2px;
`;

const LabelComponent = React.memo(function LabelComponent({
  field,
  isActive,
  hasErrors,
  uniqueFieldId,
  isFieldRequired,
  t,
}) {
  const label = `${field.get('label', field.get('name'))}`;
  const labelComponent = (
    <FieldLabel isActive={isActive} hasErrors={hasErrors} htmlFor={uniqueFieldId}>
      {label}
      {isFieldRequired && (
        <RequiredFieldMarker aria-hidden="true" title={t('editor.editorControl.field.required')}>
          {' *'}
        </RequiredFieldMarker>
      )}
    </FieldLabel>
  );

  return labelComponent;
});

// Named export of the unconnected class purely for unit testing (see
// EditorControl.spec.js) - rendering the `connect()`-wrapped default export
// would require a full mock Redux store for no benefit, since none of the
// aria-threading behavior under test touches redux state.
export class EditorControl extends React.Component {
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
    quickCreateEntry: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    isEditorComponent: PropTypes.bool,
    isNewEditorComponent: PropTypes.bool,
    parentIds: PropTypes.arrayOf(PropTypes.string),
    entry: ImmutablePropTypes.map.isRequired,
    collection: PropTypes.object.isRequired,
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

  state = {
    activeLabel: false,
  };

  uniqueFieldId = uniqueId(`${this.props.field.get('name')}-field-`);

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(EditorControl.propTypes, this.props, 'prop', 'EditorControl');
  }

  isAncestorOfFieldError = () => {
    const { fieldsErrors } = this.props;

    if (fieldsErrors && fieldsErrors.size > 0) {
      return Object.values(fieldsErrors.toJS()).some(arr =>
        arr.some(err => err.parentIds && err.parentIds.includes(this.uniqueFieldId)),
      );
    }
    return false;
  };

  /**
   * Stable (created once per instance, not per render) callbacks handed to
   * `Widget`/`controlComponent`. Previously these were declared inline in
   * JSX during `render()`, so every EditorControl render (which itself was
   * happening on every keystroke, see `loadEntryFromCollection` comment
   * above) produced brand new function identities for `onChange`,
   * `setActiveStyle` and `setInactiveStyle`, defeating any memoization
   * (`React.memo`/`PureComponent`) further down the control tree. Reading
   * `this.props`/`this.state` fresh inside the body keeps behavior
   * identical.
   */
  handleWidgetChange = (newValue, newMetadata) => {
    const { field, onChange, clearFieldErrors } = this.props;
    onChange(field, newValue, newMetadata);
    clearFieldErrors(this.uniqueFieldId);
  };

  setActiveStyle = () => {
    this.setState({ styleActive: true });
  };

  setInactiveStyle = () => {
    this.setState({ styleActive: false });
  };

  /**
   * `partial(onValidate, this.uniqueFieldId)` (lodash) allocates a new
   * bound function every call. `uniqueFieldId` never changes for the
   * lifetime of this instance, so the only thing that should invalidate
   * the memoized value is the `onValidate` prop itself changing identity
   * (it's a stable dispatch-bound action creator from the parent, so in
   * practice this only computes once).
   */
  getBoundOnValidate = () => {
    const { onValidate } = this.props;
    if (!onValidate) {
      return undefined;
    }
    if (!this._boundOnValidate || this._boundOnValidate.source !== onValidate) {
      this._boundOnValidate = {
        source: onValidate,
        fn: partial(onValidate, this.uniqueFieldId),
      };
    }
    return this._boundOnValidate.fn;
  };

  render() {
    const {
      value,
      entry,
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
      quickCreateEntry,
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

    const widgetName = field.get('widget');
    const widget = resolveWidget(widgetName);
    const fieldName = field.get('name');
    const fieldHint = field.get('hint');
    const isFieldRequired = field.get('required') !== false;
    const onValidateObject = onValidate;
    const metadata = fieldsMetaData && fieldsMetaData.get(fieldName);
    const errors = fieldsErrors && fieldsErrors.get(this.uniqueFieldId);
    const childErrors = this.isAncestorOfFieldError();
    const hasErrors = !!errors || childErrors;
    // Stable id for the <ul.ControlErrorsList>, so the widget input can point
    // its `aria-errormessage`/`aria-describedby` at it (WCAG 2.1 3.3.1 /
    // 3.3.3). Only meaningful while this field actually has its own errors
    // (not inherited from a descendant), matching the `errors &&
    // <ControlErrorsList>` render guard below.
    const errorListId = errors ? `${this.uniqueFieldId}-errors` : undefined;

    return (
      <ClassNames>
        {({ css, cx }) => (
          <ControlContainer
            className={className}
            aria-label={t('editor.editorControl.field.widgetLabel', { widgetLabel: widgetName })}
            css={css`
              ${isHidden && styleStrings.hidden};
            `}
          >
            <ControlTopbar>
              {widget.globalStyles && <Global styles={coreCss`${widget.globalStyles}`} />}
              <LabelComponent
                field={field}
                isActive={isSelected || this.state.styleActive}
                hasErrors={hasErrors}
                uniqueFieldId={this.uniqueFieldId}
                isFieldRequired={isFieldRequired}
                t={t}
              />
              {errors && (
                <ControlErrorsList id={errorListId}>
                  {errors.map(
                    (error, index) =>
                      error.message &&
                      typeof error.message === 'string' && (
                        <li
                          key={error.message.trim().replace(/[^a-z0-9]+/gi, '-')}
                          id={`${errorListId}-${index}`}
                        >
                          {error.message}
                        </li>
                      ),
                  )}
                </ControlErrorsList>
              )}
            </ControlTopbar>
            <Widget
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
              entry={entry}
              collection={collection}
              config={config}
              field={field}
              uniqueFieldId={this.uniqueFieldId}
              hasErrors={hasErrors}
              errorListId={errorListId}
              value={value}
              mediaPaths={mediaPaths}
              metadata={metadata}
              onChange={this.handleWidgetChange}
              onValidate={this.getBoundOnValidate()}
              onOpenMediaLibrary={openMediaLibrary}
              onClearMediaControl={clearMediaControl}
              onRemoveMediaControl={removeMediaControl}
              onRemoveInsertedMedia={removeInsertedMedia}
              onPersistMedia={persistMedia}
              onAddAsset={addAsset}
              getAsset={boundGetAsset}
              hasActiveStyle={isSelected || this.state.styleActive}
              setActiveStyle={this.setActiveStyle}
              setInactiveStyle={this.setInactiveStyle}
              resolveWidget={resolveWidget}
              widget={widget}
              getEditorComponents={getEditorComponents}
              controlRef={controlRef}
              editorControl={ConnectedEditorControl}
              query={query}
              loadEntry={loadEntry}
              onQuickCreateEntry={quickCreateEntry}
              queryHits={queryHits[this.uniqueFieldId] || []}
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
                    a: ({ node: _node, ...props }) => (
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

function mapStateToProps(state) {
  const { collections, entryDraft } = state;
  const entry = entryDraft.get('entry');
  const collection = collections[entryDraft.getIn(['entry', 'collection'])];
  const isLoadingAsset = selectIsLoadingAsset(state.medias);

  return {
    mediaPaths: state.mediaLibrary.get('controlMedia'),
    isFetching: state.search.isFetching,
    queryHits: state.search.queryHits,
    config: state.config,
    entry,
    collection,
    isLoadingAsset,
  };
}

/**
 * `loadEntry` and `validateMetaField` used to be declared inside
 * `mapStateToProps` (closing over that call's `state`/`collection`). That
 * meant a brand new function was handed to every `EditorControl` instance
 * on *every* store update, regardless of whether anything relevant to that
 * field actually changed. Since `connect` bails out of re-rendering based
 * on a shallow-equal check of the merged props, a prop that is never equal
 * to its previous value (a fresh function reference every time) defeats
 * that bail-out entirely, forcing every field's control to re-render on
 * every keystroke typed anywhere in the form.
 *
 * `mapDispatchToProps` only runs once per connected component instance
 * (react-redux memoizes it against the stable `dispatch` reference), so
 * building these here instead gives them a permanently stable identity.
 * They still need *fresh* state at call time (not whatever state existed
 * when the component last rendered), which is what dispatching a thunk
 * gets us: redux-thunk calls the thunk with `(dispatch, getState)` and
 * passes back whatever it returns, so `getState()` here always reflects
 * the store at the moment `loadEntry`/`validateMetaField` are actually
 * invoked, not at the moment they were created.
 */
function mapDispatchToProps(dispatch) {
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
    boundGetAsset: (collection, entry) => boundGetAsset(dispatch, collection, entry),
    loadEntry: (collectionName, slug) =>
      dispatch((_dispatch, getState) => {
        const state = getState();
        const targetCollection = state.collections[collectionName];
        if (targetCollection) {
          return tryLoadEntry(state, targetCollection, slug);
        }
        throw new Error(`Can't find collection '${collectionName}'`);
      }),
    quickCreateEntry: (collectionName, data) =>
      dispatch((dispatchInner, getState) => {
        const state = getState();
        const targetCollection = state.collections[collectionName];
        if (!targetCollection) {
          throw new Error(`Can't find collection '${collectionName}'`);
        }
        return dispatchInner(persistQuickCreateEntry(targetCollection, data));
      }),
    validateMetaField: (collection, field, value, t) =>
      dispatch((_dispatch, getState) =>
        validateMetaFieldAction(getState(), collection, field, value, t),
      ),
  };
}

function mergeProps(stateProps, dispatchProps, ownProps) {
  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    boundGetAsset: dispatchProps.boundGetAsset(stateProps.collection, stateProps.entry),
  };
}

const ConnectedEditorControl = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(translate()(EditorControl));

export default ConnectedEditorControl;
