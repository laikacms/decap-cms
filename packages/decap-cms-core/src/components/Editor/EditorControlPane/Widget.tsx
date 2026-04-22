import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { Map, List } from 'immutable';
import { oneLine } from 'common-tags';

import { getRemarkPlugins } from '../../../lib/registry';
import ValidationErrorTypes from '../../../constants/validationErrorTypes';

import type { Map as ImmutableMap } from 'immutable';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type { WidgetProps, ValidationResult, ValidationError } from 'decap-cms-lib-util/types/cms-immutable';

function truthy() {
  return { error: false };
}

function isEmpty(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    (Object.prototype.hasOwnProperty.call(value, 'length') &&
      (value as { length: number }).length === 0) ||
    ((value as object).constructor === Object && Object.keys(value as object).length === 0) ||
    (List.isList(value) && (value as List<unknown>).size === 0)
  );
}

export default class Widget extends Component<WidgetProps> {
  innerWrappedControl: any;
  wrappedControlValid: (() => unknown) | undefined;
  wrappedControlShouldComponentUpdate: ((nextProps: WidgetProps) => boolean) | undefined;

  static propTypes = {
    controlComponent: PropTypes.func.isRequired,
    field: ImmutablePropTypes.map.isRequired,
    hasActiveStyle: PropTypes.bool,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
    classNameWrapper: PropTypes.string.isRequired,
    classNameWidget: PropTypes.string.isRequired,
    classNameWidgetActive: PropTypes.string.isRequired,
    classNameLabel: PropTypes.string.isRequired,
    classNameLabelActive: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.object,
      PropTypes.string,
      PropTypes.bool,
    ]),
    mediaPaths: ImmutablePropTypes.map.isRequired,
    metadata: ImmutablePropTypes.map,
    fieldsErrors: ImmutablePropTypes.map,
    onChange: PropTypes.func.isRequired,
    onValidate: PropTypes.func,
    controlRef: PropTypes.func,
    onOpenMediaLibrary: PropTypes.func.isRequired,
    onClearMediaControl: PropTypes.func.isRequired,
    onRemoveMediaControl: PropTypes.func.isRequired,
    onPersistMedia: PropTypes.func.isRequired,
    onAddAsset: PropTypes.func.isRequired,
    onRemoveInsertedMedia: PropTypes.func.isRequired,
    getAsset: PropTypes.func.isRequired,
    resolveWidget: PropTypes.func.isRequired,
    widget: PropTypes.object.isRequired,
    getEditorComponents: PropTypes.func.isRequired,
    isFetching: PropTypes.bool,
    query: PropTypes.func.isRequired,
    clearSearch: PropTypes.func.isRequired,
    clearFieldErrors: PropTypes.func.isRequired,
    queryHits: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    editorControl: PropTypes.elementType.isRequired,
    uniqueFieldId: PropTypes.string.isRequired,
    loadEntry: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    onValidateObject: PropTypes.func,
    isEditorComponent: PropTypes.bool,
    isNewEditorComponent: PropTypes.bool,
    /**
     * @deprecated Every update creates a new entry, passing a live value down is too expensive. Use the getEntry callback instead or get the value from the store directly in the widget via `useSelector` or `connect`.
     */
    entry: ImmutablePropTypes.map.isRequired,
    getEntry: PropTypes.func.isRequired,
    isDisabled: PropTypes.bool,
    isFieldDuplicate: PropTypes.func,
    isFieldHidden: PropTypes.func,
    locale: PropTypes.string,
    isParentListCollapsed: PropTypes.bool,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(Widget.propTypes, this.props, 'prop', 'Widget');
  }

  shouldComponentUpdate(nextProps: WidgetProps) {
    /**
     * Avoid unnecessary rerenders while loading assets.
     */
    if (this.props.isLoadingAsset && nextProps.isLoadingAsset) return false;
    /**
     * Allow widgets to provide their own `shouldComponentUpdate` method.
     */
    if (this.wrappedControlShouldComponentUpdate) {
      return this.wrappedControlShouldComponentUpdate(nextProps);
    }
    return (
      this.props.value !== nextProps.value ||
      this.props.classNameWrapper !== nextProps.classNameWrapper ||
      this.props.hasActiveStyle !== nextProps.hasActiveStyle
    );
  }

  processInnerControlRef = (ref: any) => {
    if (!ref) return;

    /**
     * If the widget is a container that receives state updates from the store,
     * we'll need to get the ref of the actual control via the `react-redux`
     * `getWrappedInstance` method. Note that connected widgets must pass
     * `withRef: true` to `connect` in the options object.
     */
    this.innerWrappedControl = ref.getWrappedInstance ? ref.getWrappedInstance() : ref;

    this.wrappedControlValid = this.innerWrappedControl.isValid || truthy;

    /**
     * Get the `shouldComponentUpdate` method from the wrapped control, and
     * provide the control instance is the `this` binding.
     */
    const { shouldComponentUpdate: scu } = this.innerWrappedControl;
    this.wrappedControlShouldComponentUpdate = scu && scu.bind(this.innerWrappedControl);

    // Call the control ref if provided, passing this Widget instance
    if (this.props.controlRef) {
      this.props.controlRef(this);
    }
  };

  focus(path: string | string[]) {
    // Try widget's custom focus method first
    if (this.innerWrappedControl?.focus) {
      this.innerWrappedControl.focus(path);
    } else {
      // Fall back to focusing by ID for simple widgets
      const element = document.getElementById(this.props.uniqueFieldId);
      element?.focus();
    }
    // After focusing, ensure the element is visible
    const label = document.querySelector(`label[for="${this.props.uniqueFieldId}"]`);
    if (label) {
      label.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  getValidateValue = () => {
    let value = this.innerWrappedControl?.getValidateValue?.() || this.props.value;
    // Convert list input widget value to string for validation test
    if (List.isList(value)) value = value.join(',');
    return value;
  };

  validate = (skipWrapped: ValidationResult | boolean = false) => {
    const value = this.getValidateValue();
    const field = this.props.field;
    const errors: (ValidationError | false)[] = [];
    const validations: ((
      field: ImmutableMap<string, unknown>,
      value: unknown,
      t: TranslateFunction,
    ) => ValidationResult)[] = [this.validatePresence, this.validatePattern];
    if (field.get('meta')) {
      if (this.props.validateMetaField) {
        validations.push(this.props.validateMetaField);
      }
    }
    validations.forEach(func => {
      const response = func(field, value, this.props.t);
      if (response.error) errors.push(response.error);
    });
    if (skipWrapped && typeof skipWrapped === 'object') {
      if (skipWrapped.error) errors.push(skipWrapped.error);
    } else if (!skipWrapped) {
      const wrappedError = this.validateWrappedControl(field);
      if (wrappedError.error) errors.push(wrappedError.error);
    }

    this.props.onValidate?.(errors);
  };

  validatePresence = (
    field: ImmutableMap<string, unknown>,
    value: unknown,
  ): ValidationResult => {
    const { t, parentIds } = this.props;
    const isRequired = field.get('required', true);
    if (isRequired && isEmpty(value)) {
      const error: ValidationError = {
        type: ValidationErrorTypes.PRESENCE,
        parentIds,
        message: t('editor.editorControlPane.widget.required', {
          fieldLabel: field.get('label', field.get('name')),
        }),
      };

      return { error };
    }
    return { error: false };
  };

  validatePattern = (
    field: ImmutableMap<string, unknown>,
    value: unknown,
  ): ValidationResult => {
    const { t, parentIds } = this.props;
    const pattern = field.get('pattern', false) as List<string> | false;

    if (isEmpty(value)) {
      return { error: false };
    }

    if (pattern && !RegExp(pattern.first() as string).test(value as string)) {
      const error: ValidationError = {
        type: ValidationErrorTypes.PATTERN,
        parentIds,
        message: t('editor.editorControlPane.widget.regexPattern', {
          fieldLabel: field.get('label', field.get('name')),
          pattern: pattern.last(),
        }),
      };

      return { error };
    }

    return { error: false };
  };

  validateWrappedControl = (field: ImmutableMap<string, unknown>): ValidationResult => {
    const { t, parentIds } = this.props;
    if (typeof this.wrappedControlValid !== 'function') {
      throw new Error(oneLine`
        this.wrappedControlValid is not a function. Are you sure widget
        "${field.get('widget')}" is registered?
      `);
    }

    const response = this.wrappedControlValid();
    if (typeof response === 'boolean') {
      const isValid = response;
      return { error: !isValid as unknown as ValidationError | false };
    } else if (
      response &&
      typeof response === 'object' &&
      Object.prototype.hasOwnProperty.call(response, 'error')
    ) {
      return response as ValidationResult;
    } else if (response instanceof Promise) {
      response.then(
        () => {
          this.validate({ error: false });
        },
        (err: unknown) => {
          const error: ValidationError = {
            type: ValidationErrorTypes.CUSTOM,
            message: `${field.get('label', field.get('name'))} - ${err}.`,
          };

          this.validate({ error });
        },
      );

      const error: ValidationError = {
        type: ValidationErrorTypes.CUSTOM,
        parentIds,
        message: t('editor.editorControlPane.widget.processing', {
          fieldLabel: field.get('label', field.get('name')),
        }),
      };

      return { error };
    }
    return { error: false };
  };

  /**
   * In case the `onChangeObject` function is frozen by a child widget implementation,
   * e.g. when debounced, always get the latest object value instead of using
   * `this.props.value` directly.
   */
  getObjectValue = () => (this.props.value || Map()) as ImmutableMap<string, unknown>;

  /**
   * Change handler for fields that are nested within another field.
   */
  onChangeObject = (
    field: ImmutableMap<string, unknown>,
    newValue: unknown,
    newMetadata: Record<string, unknown> | undefined,
  ) => {
    const newObjectValue = this.getObjectValue().set(
      field.get('name') as string,
      newValue,
    );
    return this.props.onChange(
      newObjectValue,
      newMetadata && { [this.props.field.get('name') as string]: newMetadata },
    );
  };

  setInactiveStyle = () => {
    this.props.setInactiveStyle();
    if (this.props.field.has('pattern') && !isEmpty(this.getValidateValue())) {
      this.validate();
    }
  };

  render() {
    const {
      controlComponent,
      entry, // TODO: Remove this prop in favor of getEntry
      getEntry,
      collection,
      config,
      field,
      value,
      mediaPaths,
      metadata,
      onChange,
      onValidateObject,
      onOpenMediaLibrary,
      onRemoveMediaControl,
      onPersistMedia,
      onClearMediaControl,
      onAddAsset,
      onRemoveInsertedMedia,
      getAsset,
      classNameWrapper,
      classNameWidget,
      classNameWidgetActive,
      classNameLabel,
      classNameLabelActive,
      setActiveStyle,
      hasActiveStyle,
      editorControl,
      uniqueFieldId,
      resolveWidget,
      widget,
      getEditorComponents,
      query,
      queryHits,
      clearSearch,
      clearFieldErrors,
      isFetching,
      loadEntry,
      fieldsErrors,
      controlRef,
      isEditorComponent,
      isNewEditorComponent,
      parentIds,
      t,
      isDisabled,
      isFieldDuplicate,
      isFieldHidden,
      locale,
      isParentListCollapsed,
    } = this.props;

    return React.createElement(controlComponent as React.ComponentType<Record<string, unknown>>, {
      entry, // TODO: Remove this deprecated prop in favor of getEntry
      getEntry,
      collection,
      config,
      field,
      value,
      mediaPaths,
      metadata,
      onChange,
      onChangeObject: this.onChangeObject,
      onValidateObject,
      onOpenMediaLibrary,
      onClearMediaControl,
      onRemoveMediaControl,
      onPersistMedia,
      onAddAsset,
      onRemoveInsertedMedia,
      getAsset,
      forID: uniqueFieldId,
      ref: this.processInnerControlRef,
      validate: this.validate,
      classNameWrapper,
      classNameWidget,
      classNameWidgetActive,
      classNameLabel,
      classNameLabelActive,
      setActiveStyle,
      setInactiveStyle: () => this.setInactiveStyle(),
      hasActiveStyle,
      editorControl,
      resolveWidget,
      widget,
      getEditorComponents,
      getRemarkPlugins,
      query,
      queryHits,
      clearSearch,
      clearFieldErrors,
      isFetching,
      loadEntry,
      isEditorComponent,
      isNewEditorComponent,
      fieldsErrors,
      controlRef,
      parentIds,
      t,
      isDisabled,
      isFieldDuplicate,
      isFieldHidden,
      locale,
      isParentListCollapsed,
    });
  }
}

type Wi = typeof Widget;

