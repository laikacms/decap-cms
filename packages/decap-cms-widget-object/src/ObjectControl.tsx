import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { ClassNames } from '@emotion/react';
import memoize from 'lodash/memoize';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import { colors, lengths, ObjectWidgetTopBar } from 'decap-cms-ui-default';
import type { TranslateFunction } from 'decap-cms-ui-default';
import { stringTemplate } from 'decap-cms-lib-widgets';

import type { CmsField, CmsFieldBase, CmsFieldObject } from 'decap-cms-lib-util/types/cms';

const styleStrings = {
  nestedObjectControl: `s
    padding: 6px 14px 14px;
    border-top: 0;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  `,
  objectWidgetTopBarContainer: `
    padding: ${lengths.objectWidgetTopBarContainerPadding};
  `,
  collapsedObjectControl: `
    display: none;
  `,
};

/** Minimal shape for a widget control ref passed through controlRef */
interface WidgetControlRef {
  props: { field: CmsField };
  validate?: () => void;
  focus?: (path: string) => void;
  innerWrappedControl?: {
    validate?: () => void;
  };
}

interface ObjectControlProps {
  /** Called when a nested field value changes (provided by Widget wrapper or ListControl) */
  onChangeObject: (field: CmsField, newValue: unknown, newMetadata?: Record<string, unknown>) => void;
  /** Called to set validation errors for a specific field ID */
  onValidateObject?: ((fieldId: string | CmsField, errors: Array<{ type: string; message: string }>) => void) | undefined;
  /** The current object value */
  value?: CmsField | unknown;
  /** The field configuration */
  field: CmsFieldObject & CmsFieldBase;
  /** Unique field identifier */
  forID?: string;
  /** CSS class name for the widget wrapper */
  classNameWrapper: string;
  /** Whether this object is rendered inside a list widget */
  forList?: boolean;
  /** Callback to register a ref for this control */
  controlRef?: ((ref: WidgetControlRef | null) => void) | undefined;
  /** The connected EditorControl component for rendering nested fields */
  editorControl: React.ComponentType<Record<string, unknown>>;
  /** Resolves a widget by name */
  resolveWidget: (name: string) => Record<string, unknown>;
  /** Clears field errors for a given field ID */
  clearFieldErrors: (fieldId: string) => void;
  /** Key used for validation tracking (typically the list item's uuid) */
  validationKey: string;
  /** Map of field IDs to arrays of validation errors */
  fieldsErrors?: Record<string, unknown>;
  /** Metadata for the field's collection */
  metadata?: Record<string, unknown>;
  /** Whether this control has a validation error */
  hasError?: boolean;
  /** Translation function */
  t: TranslateFunction;
  /** Current locale for i18n */
  locale?: string;
  /** Whether the object is collapsed (when inside a list) */
  collapsed?: boolean;
  /** Parent field IDs for nested validation tracking */
  parentIds?: string[];
  /** Returns whether a field is a duplicate (i18n) */
  isFieldDuplicate?: (field: CmsField) => boolean;
  /** Returns whether a field should be hidden (i18n) */
  isFieldHidden?: (field: CmsField) => boolean;
}

interface ObjectControlState {
  collapsed: boolean;
}

export default class ObjectControl extends React.Component<ObjectControlProps, ObjectControlState> {
  childRefs: Record<string, WidgetControlRef> = {};

  processControlRef = (ref: WidgetControlRef | null) => {
    if (!ref) return;
    const name = ref.props.field.name;
    this.childRefs[name as string] = ref;
    this.props.controlRef?.(ref);
  };

  static propTypes = {
    onChangeObject: PropTypes.func.isRequired,
    onValidateObject: PropTypes.func,
    value: PropTypes.oneOfType([PropTypes.node, PropTypes.object, PropTypes.bool]),
    field: PropTypes.object,
    forID: PropTypes.string,
    classNameWrapper: PropTypes.string.isRequired,
    forList: PropTypes.bool,
    controlRef: PropTypes.func,
    editorControl: PropTypes.elementType.isRequired,
    resolveWidget: PropTypes.func.isRequired,
    clearFieldErrors: PropTypes.func.isRequired,
    fieldsErrors: ImmutablePropTypes.map,
    hasError: PropTypes.bool,
    t: PropTypes.func,
    locale: PropTypes.string,
    collapsed: PropTypes.bool,
  };

  static defaultProps = {
    value: {},
  };

  constructor(props: ObjectControlProps) {
    super(props);
    this.state = {
      collapsed: props.field.collapsed ?? false,
    };
  }

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(ObjectControl.propTypes, this.props, 'prop', 'ObjectControl');
  }

  /*
   * Always update so that each nested widget has the option to update. This is
   * required because ControlHOC provides a default `shouldComponentUpdate`
   * which only updates if the value changes, but every widget must be allowed
   * to override this.
   */
  shouldComponentUpdate() {
    return true;
  }

  validate = () => {
    const { field } = this.props;
    const fields = field.fields;
    fields.forEach((field: CmsField) => {
      if (field.widget === 'hidden') return;
      const name = field.name;
      const control = this.childRefs[name];
      if (!control) return;

      if (control.innerWrappedControl?.validate) {
        control.innerWrappedControl.validate();
      } else {
        control.validate?.();
      }
    });
  };

  getStableParentIds = memoize(
    (parentIds: string[], forID: string) => [...parentIds, forID],
    (parentIds: string[], forID: string) =>
      JSON.stringify([parentIds, forID]) /* Fast enough for only ids */,
  );

  controlFor(field: CmsField, key?: number) {
    const {
      value,
      onChangeObject,
      onValidateObject,
      clearFieldErrors,
      metadata,
      fieldsErrors,
      editorControl: EditorControl,
      parentIds,
      isFieldDuplicate,
      isFieldHidden,
      locale,
      collapsed,
      forID,
    } = this.props;

    if (field.widget === 'hidden') {
      return null;
    }
    const fieldName = field.name;
    const fieldValue = get(value, fieldName);

    const isDuplicate = isFieldDuplicate && isFieldDuplicate(field);
    const isHidden = isFieldHidden && isFieldHidden(field);

    return (
      <EditorControl
        key={key}
        field={field}
        value={fieldValue}
        onChange={onChangeObject}
        clearFieldErrors={clearFieldErrors}
        fieldsMetaData={metadata}
        fieldsErrors={fieldsErrors}
        onValidate={onValidateObject}
        controlRef={this.processControlRef}
        parentIds={this.getStableParentIds(parentIds || [], forID || '')}
        isDisabled={isDuplicate}
        isHidden={isHidden}
        isFieldDuplicate={isFieldDuplicate}
        isFieldHidden={isFieldHidden}
        locale={locale}
        isParentListCollapsed={collapsed}
      />
    );
  }

  handleCollapseToggle = () => {
    this.setState({ collapsed: !this.state.collapsed });
  };

  focus(path?: string) {
    if (this.state.collapsed) {
      this.setState({ collapsed: false }, () => {
        if (path) {
          const [fieldName, ...remainingPath] = path.split('.');
          const control = this.childRefs[fieldName];
          control?.focus?.(remainingPath.join('.'));
        }
      });
    } else if (path) {
      const [fieldName, ...remainingPath] = path.split('.');
      const control = this.childRefs[fieldName];
      control?.focus?.(remainingPath.join('.'));
    }
  }

  renderFields = (multiFields: CmsField[]) => {
    return multiFields.map((f, idx) => this.controlFor(f, idx));
  };

  objectLabel = (): React.ReactNode => {
    const { value, field } = this.props;
    const label = field.label || field.name;
    const summary = field.summary;
    return summary
      ? stringTemplate.compileStringTemplate(
          summary,
          null,
          '',
          (value && isObject(value) ? value : {}) as Record<string, unknown>,
        )
      : (label as React.ReactNode);
  };

  render() {
    const { field, forID, classNameWrapper, forList, hasError, t } = this.props;
    const collapsed = forList ? this.props.collapsed : this.state.collapsed;
    const multiFields = field.fields as CmsField[];

    if (multiFields) {
      return (
        <ClassNames>
          {({ css, cx }) => (
            <div
              id={forID}
              className={cx(
                classNameWrapper,
                css`
                  ${styleStrings.objectWidgetTopBarContainer}
                `,
                {
                  [css`
                    ${styleStrings.nestedObjectControl}
                  `]: forList,
                },
                {
                  [css`
                    border-color: ${colors.textFieldBorder};
                  `]: forList ? !hasError : false,
                },
              )}
            >
              {forList ? null : (
                <ObjectWidgetTopBar
                  collapsed={collapsed}
                  onCollapseToggle={this.handleCollapseToggle}
                  heading={collapsed && this.objectLabel()}
                  t={t}
                />
              )}
              <div
                className={cx({
                  [css`
                    ${styleStrings.collapsedObjectControl}
                  `]: collapsed,
                })}
              >
                {this.renderFields(multiFields)}
              </div>
            </div>
          )}
        </ClassNames>
      );
    }

    return <h3>No field(s) defined for this widget</h3>;
  }
}
