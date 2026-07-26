import styled from '@emotion/styled';
import React from 'react';

import { colors } from '@/ui/default/index';
import { laikaFieldStyles } from './fieldStyles';

interface FormFieldContextValue {
  controlId: string;
  describedBy?: string;
  invalid: boolean;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`;

const Label = styled.label`
  color: ${colors.textLead};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
`;

const SupportingText = styled.span`
  color: ${colors.controlLabel};
  font-size: 12px;
  line-height: 1.4;
`;

const ErrorText = styled.span`
  color: ${colors.errorText};
  font-size: 12px;
  line-height: 1.4;
`;

export interface LaikaFormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  supportingText?: React.ReactNode;
  error?: React.ReactNode;
  /** Exactly one LaikaTextField, LaikaTextArea, or LaikaSelect. */
  children: React.ReactElement;
}

function useFormControlProps<
  T extends {
    id?: string,
    'aria-describedby'?: string,
    'aria-invalid'?: React.AriaAttributes['aria-invalid'],
  },
>(props: T): T {
  const field = React.useContext(FormFieldContext);
  if (!field) {
    return props;
  }

  const describedBy = [props['aria-describedby'], field.describedBy].filter(Boolean).join(' ') || undefined;
  return {
    ...props,
    id: props.id ?? field.controlId,
    'aria-describedby': describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid ? true : undefined),
  };
}

const Input = styled.input`
  ${laikaFieldStyles};
`;

export type LaikaTextFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

export const LaikaTextField = React.forwardRef<HTMLInputElement, LaikaTextFieldProps>(
  function LaikaTextField(props, ref) {
    return <Input ref={ref} type="text" {...useFormControlProps(props)} />;
  },
);

const TextArea = styled.textarea`
  ${laikaFieldStyles};
  resize: vertical;
`;

export type LaikaTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const LaikaTextArea = React.forwardRef<HTMLTextAreaElement, LaikaTextAreaProps>(
  function LaikaTextArea(props, ref) {
    return <TextArea ref={ref} {...useFormControlProps(props)} />;
  },
);

const Select = styled.select`
  ${laikaFieldStyles};
`;

export type LaikaSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const LaikaSelect = React.forwardRef<HTMLSelectElement, LaikaSelectProps>(
  function LaikaSelect(props, ref) {
    return <Select ref={ref} {...useFormControlProps(props)} />;
  },
);

export function LaikaFormField({
  label,
  supportingText,
  error,
  children,
  ...rest
}: LaikaFormFieldProps) {
  const generatedId = React.useId();
  const control = React.Children.only(children);
  const isLaikaControl = control.type === LaikaTextField || control.type === LaikaTextArea
    || control.type === LaikaSelect;

  if (!isLaikaControl) {
    throw new Error('LaikaFormField requires exactly one Laika form control');
  }

  const childControlId = (control.props as { id?: string }).id;
  const controlId = childControlId ?? `laika-field-${generatedId}`;
  const supportingTextId = supportingText ? `${controlId}-supporting` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [supportingTextId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <FormFieldContext.Provider value={{ controlId, describedBy, invalid: Boolean(error) }}>
      <FieldGroup {...rest}>
        {label ? <Label htmlFor={controlId}>{label}</Label> : null}
        {control}
        {supportingText ? <SupportingText id={supportingTextId}>{supportingText}</SupportingText> : null}
        {error
          ? (
            <ErrorText id={errorId} role="alert">
              {error}
            </ErrorText>
          )
          : null}
      </FieldGroup>
    </FormFieldContext.Provider>
  );
}
