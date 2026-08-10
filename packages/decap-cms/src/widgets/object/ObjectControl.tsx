import { Collapsible } from '@base-ui/react/collapsible';
import { ClassNames } from '@emotion/react';
import { get, isObject, memoize } from 'lodash-es';
import React from 'react';

import { stringTemplate } from '@/lib/widgets/index';
import { colors, lengths, ObjectWidgetTopBar } from '@/ui/default/index';

import type { CmsField, CmsFieldBase, CmsFieldObject } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const styleStrings = {
  nestedObjectControl: `
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

interface WidgetControlRef {
  props: { field: CmsField };
  validate?: () => void;
  focus?: (path: string) => void;
  innerWrappedControl?: {
    validate?: () => void,
  };
}

export interface ObjectControlProps {
  onChangeObject: (
    field: CmsField,
    newValue: unknown,
    newMetadata?: Record<string, unknown>,
  ) => void;
  onValidateObject?:
    | ((fieldId: string | CmsField, errors: Array<{ type: string, message: string }>) => void)
    | undefined;
  value?: CmsField | unknown;
  // Also accepts a list field with a singular `field` when used as the item
  // shell of a single-field ListControl.
  field: CmsFieldObject & CmsFieldBase & { field?: CmsField };
  forID?: string;
  classNameWrapper: string;
  forList?: boolean;
  controlRef?: ((ref: WidgetControlRef | null) => void) | undefined;
  editorControl: React.ComponentType<Record<string, unknown>>;
  resolveWidget: (name: string) => Record<string, unknown>;
  clearFieldErrors: (fieldId: string) => void;
  validationKey?: string;
  fieldsErrors?: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
  hasError?: boolean | undefined;
  t: TranslateFunction;
  locale?: string | undefined;
  collapsed?: boolean;
  parentIds?: string[];
  isFieldDuplicate?: (field: CmsField) => boolean;
  isFieldHidden?: (field: CmsField) => boolean;
}

export interface ObjectControlHandle {
  validate(): void;
  focus(path?: string): void;
  // Exposed so a parent ListControl can key this item's ref by the same
  // identifier it passed in. The imperative handle is a plain object with no
  // `.props`, so the key has to travel on the handle itself.
  validationKey?: string | undefined;
}

const ObjectControl = React.forwardRef<ObjectControlHandle, ObjectControlProps>(
  function ObjectControl(props, ref) {
    const {
      value = {},
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
      forID,
      forList,
      hasError,
      t,
      field,
      classNameWrapper,
    } = props;

    const childRefs = React.useRef<Record<string, WidgetControlRef>>({});
    const [collapsed, setCollapsed] = React.useState<boolean>(field.collapsed ?? false);

    function processControlRef(childRef: WidgetControlRef | null) {
      if (!childRef) return;
      const name = childRef.props.field.name;
      childRefs.current[name as string] = childRef;
      // Do NOT call `props.controlRef?.(childRef)` here. That ref belongs
      // to *this* ObjectControl in the parent's slot — propagating sub-field
      // widgets up would overwrite the parent's slot with the last child to
      // mount, which breaks validation traversal (the parent EditorControlPane
      // would call validate on a sibling-leaf widget instead of on this
      // ObjectControl's imperative handle).
    }

    React.useImperativeHandle(
      ref,
      () => ({
        validate() {
          const fields = field.field ? [field.field] : (field.fields ?? []);
          fields.forEach((f: CmsField) => {
            if (f.widget === 'hidden') return;
            const control = childRefs.current[f.name];
            if (!control) return;
            if (control.innerWrappedControl?.validate) {
              control.innerWrappedControl.validate();
            } else {
              control.validate?.();
            }
          });
        },
        focus(path?: string) {
          if (collapsedRef.current) {
            setCollapsed(false);
            // Defer focus until after the collapse state has been applied.
            requestAnimationFrame(() => {
              if (path) {
                const [fieldName, ...remainingPath] = path.split('.');
                const control = childRefs.current[fieldName];
                control?.focus?.(remainingPath.join('.'));
              }
            });
          } else if (path) {
            const [fieldName, ...remainingPath] = path.split('.');
            const control = childRefs.current[fieldName];
            control?.focus?.(remainingPath.join('.'));
          }
        },
        validationKey: props.validationKey,
      }),
      [field.field, field.fields, props.validationKey],
    );

    // Track collapsed in a ref so the imperative handle can branch on it
    // without being recreated on every collapse toggle.
    const collapsedRef = React.useRef(collapsed);
    collapsedRef.current = forList ? !!props.collapsed : collapsed;

    const getStableParentIds = React.useMemo(
      () =>
        memoize(
          (parentIdsArr: string[], forIDArg: string) => [...parentIdsArr, forIDArg],
          (parentIdsArr: string[], forIDArg: string) => JSON.stringify([parentIdsArr, forIDArg]), /* fast for ids */
        ),
      [],
    );

    function controlFor(f: CmsField, key?: number) {
      if (f.widget === 'hidden') return null;
      const fieldName = f.name;
      // Single-field list items are scalars; the value IS the field value.
      const fieldValue = isObject(value) ? get(value, fieldName) : value;
      const isDuplicate = isFieldDuplicate?.(f);
      const isHidden = isFieldHidden?.(f);

      return (
        <EditorControl
          key={key}
          field={f}
          value={fieldValue}
          onChange={onChangeObject}
          clearFieldErrors={clearFieldErrors}
          fieldsMetaData={metadata}
          fieldsErrors={fieldsErrors}
          onValidate={onValidateObject}
          controlRef={processControlRef}
          parentIds={getStableParentIds(parentIds || [], forID || '')}
          isDisabled={isDuplicate}
          isHidden={isHidden}
          isFieldDuplicate={isFieldDuplicate}
          isFieldHidden={isFieldHidden}
          locale={locale}
          isParentListCollapsed={collapsedRef.current}
        />
      );
    }

    function objectLabel(): React.ReactNode {
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
    }

    const renderedCollapsed = forList ? props.collapsed : collapsed;
    const multiFields = field.fields as CmsField[] | undefined;
    const singleField = field.field;

    if (!multiFields && !singleField) {
      return <h3>No field(s) defined for this widget</h3>;
    }

    const renderedFields = multiFields
      ? multiFields.map((f, idx) => controlFor(f, idx))
      : controlFor(singleField as CmsField);

    return (
      <ClassNames>
        {({ css, cx }) => {
          const wrapperClassName = cx(
            classNameWrapper,
            css`
              ${styleStrings.objectWidgetTopBarContainer}
            `,
            {
              [
                css`
                ${styleStrings.nestedObjectControl}
              `
              ]: forList,
            },
            {
              [
                css`
                border-color: ${colors.textFieldBorder};
              `
              ]: forList ? !hasError : false,
            },
          );

          // As a list item shell the collapse trigger and state live in the
          // parent ListControl, which hides this whole control; only the
          // standalone object widget owns its Collapsible.
          if (forList) {
            return (
              <div id={forID} className={wrapperClassName}>
                <div
                  className={cx({
                    [
                      css`
                      ${styleStrings.collapsedObjectControl}
                    `
                    ]: renderedCollapsed,
                  })}
                >
                  {renderedFields}
                </div>
              </div>
            );
          }

          // Explicit, known panel id: Base UI's Collapsible.Trigger only
          // emits `aria-controls` when `open` is true (upstream gap, see
          // DCMS-1725), so we own the id and backfill `aria-controls` on the
          // trigger ourselves in ObjectWidgetTopBar regardless of state.
          const panelId = `${forID}-panel`;

          return (
            <Collapsible.Root
              id={forID}
              className={wrapperClassName}
              open={!collapsed}
              onOpenChange={open => setCollapsed(!open)}
            >
              <ObjectWidgetTopBar
                collapsibleTrigger
                panelId={panelId}
                collapsed={renderedCollapsed}
                heading={renderedCollapsed && objectLabel()}
                t={t}
              />
              <Collapsible.Panel
                id={panelId}
                keepMounted
                className={css`
                  &[hidden] {
                    display: none;
                  }
                `}
              >
                {renderedFields}
              </Collapsible.Panel>
            </Collapsible.Root>
          );
        }}
      </ClassNames>
    );
  },
);

export default ObjectControl;
