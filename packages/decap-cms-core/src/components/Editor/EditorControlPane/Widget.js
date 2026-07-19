import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { Map, List } from 'immutable';
import { oneLine } from 'common-tags';

import { getRemarkPlugins } from '../../../lib/registry';
import ValidationErrorTypes from '../../../constants/validationErrorTypes';

function truthy() {
  return { error: false };
}

function isEmpty(value) {
  return (
    value === null ||
    value === undefined ||
    (Object.prototype.hasOwnProperty.call(value, 'length') && value.length === 0) ||
    (value.constructor === Object && Object.keys(value).length === 0) ||
    (List.isList(value) && value.size === 0)
  );
}

export default class Widget extends Component {
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
    entry: ImmutablePropTypes.map.isRequired,
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

  shouldComponentUpdate(nextProps) {
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

  processInnerControlRef = ref => {
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

  focus(path) {
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
    List.isList(value) && (value = value.join(','));
    // Convert object (Map) widget value to a JSON string for validation test,
    // instead of Immutable's debug-string toString() representation
    Map.isMap(value) && (value = JSON.stringify(value.toJS()));
    return value;
  };

  // DCMS-458: a Standard Schema-compliant validator (zod/valibot/arktype/effect
  // Schema/...) set as `field.validate` takes over as the sole source of field
  // errors for this field, in place of the built-in required/pattern checks -
  // see `~standard.validate` at https://github.com/standard-schema/standard-schema.
  // Fields without `validate` are unaffected and keep running the checks below.
  getStandardSchema = field => {
    const schema = field.get('validate');
    if (schema && schema['~standard'] && typeof schema['~standard'].validate === 'function') {
      return schema;
    }
    return undefined;
  };

  validateStandardSchema = standardSchema => {
    const { t, field, parentIds } = this.props;
    const value = this.getValidateValue();
    const result = standardSchema['~standard'].validate(value);

    const applyResult = resolved => {
      const issues = resolved && resolved.issues;
      if (!issues || issues.length === 0) {
        this.props.onValidate([]);
        return;
      }
      this.props.onValidate(
        issues.map(issue => ({
          type: ValidationErrorTypes.CUSTOM,
          parentIds,
          message: issue.message,
        })),
      );
    };

    if (result instanceof Promise) {
      // Surface a transient "processing" error while the async validator
      // resolves, mirroring `validateWrappedControl`'s async handling below.
      this.props.onValidate([
        {
          type: ValidationErrorTypes.CUSTOM,
          parentIds,
          message: t('editor.editorControlPane.widget.processing', {
            fieldLabel: field.get('label', field.get('name')),
          }),
        },
      ]);
      result.then(applyResult, err => {
        this.props.onValidate([
          {
            type: ValidationErrorTypes.CUSTOM,
            parentIds,
            message: `${field.get('label', field.get('name'))} - ${err}.`,
          },
        ]);
      });
      return;
    }

    applyResult(result);
  };

  validate = (skipWrapped = false) => {
    const field = this.props.field;

    const standardSchema = this.getStandardSchema(field);
    if (standardSchema) {
      this.validateStandardSchema(standardSchema);
      return;
    }

    const value = this.getValidateValue();
    const errors = [];
    const validations = [this.validatePresence, this.validatePattern];
    if (field.get('meta')) {
      // `validateMetaField` now takes `collection` explicitly (it's
      // dispatch-bound in EditorControl.js so its identity stays stable
      // across renders instead of being rebuilt on every store update);
      // adapt it to the shared `(field, value, t) => response` shape used
      // by the other validators here.
      validations.push((f, v, t) => this.props.validateMetaField(this.props.collection, f, v, t));
    }
    validations.forEach(func => {
      const response = func(field, value, this.props.t);
      if (response.error) errors.push(response.error);
    });
    if (skipWrapped) {
      if (skipWrapped.error) errors.push(skipWrapped.error);
    } else {
      const wrappedError = this.validateWrappedControl(field);
      if (wrappedError.error) errors.push(wrappedError.error);
    }

    this.props.onValidate(errors);
  };

  validatePresence = (field, value) => {
    const { t, parentIds } = this.props;
    const isRequired = field.get('required', true);
    if (isRequired && isEmpty(value)) {
      const error = {
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

  validatePattern = (field, value) => {
    const { t, parentIds } = this.props;
    const pattern = field.get('pattern', false);

    if (isEmpty(value)) {
      return { error: false };
    }

    if (pattern && !RegExp(pattern.first()).test(value)) {
      const error = {
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

  validateWrappedControl = field => {
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
      return { error: !isValid };
    } else if (Object.prototype.hasOwnProperty.call(response, 'error')) {
      return response;
    } else if (response instanceof Promise) {
      response.then(
        () => {
          this.validate({ error: false });
        },
        err => {
          const error = {
            type: ValidationErrorTypes.CUSTOM,
            message: `${field.get('label', field.get('name'))} - ${err}.`,
          };

          this.validate({ error });
        },
      );

      const error = {
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
  getObjectValue = () => this.props.value || Map();

  /**
   * Change handler for fields that are nested within another field.
   */
  onChangeObject = (field, newValue, newMetadata) => {
    const newObjectValue = this.getObjectValue().set(field.get('name'), newValue);
    return this.props.onChange(
      newObjectValue,
      newMetadata && { [this.props.field.get('name')]: newMetadata },
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
      entry,
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

    return React.createElement(controlComponent, {
      entry,
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
      // `this.setInactiveStyle` is already a stable, instance-bound class
      // field method (see above); wrapping it in a fresh arrow function
      // here on every render gave `controlComponent` a new prop identity
      // for no reason, defeating memoization further down the widget tree.
      setInactiveStyle: this.setInactiveStyle,
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
