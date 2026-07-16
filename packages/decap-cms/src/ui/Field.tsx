/** @jsxImportSource @emotion/react */
import { Field as FieldPrimitive } from '@base-ui/react/field';
import { Fieldset as FieldsetPrimitive } from '@base-ui/react/fieldset';
import * as React from 'react';
import { useMemo } from 'react';

import { Label } from './Label';
import { Separator } from './Separator';
import { css, variants, type WithClassName } from './styled';

const fieldSetClass = css`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export function FieldSet({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof FieldsetPrimitive.Root>>): React.ReactNode {
  return <FieldsetPrimitive.Root data-slot="field-set" css={fieldSetClass} className={className} {...props} />;
}

const legendClass = css`
  margin-bottom: 0.75rem;
  font-weight: 500;
  &[data-variant='label'] {
    font-size: 0.875rem;
  }
  &[data-variant='legend'] {
    font-size: 1rem;
  }
`;

export function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: WithClassName<React.ComponentProps<typeof FieldsetPrimitive.Legend>> & {
  variant?: 'legend' | 'label',
}): React.ReactNode {
  return (
    <FieldsetPrimitive.Legend
      data-slot="field-legend"
      data-variant={variant}
      render={<legend />}
      css={legendClass}
      className={className}
      {...props}
    />
  );
}

const fieldGroupClass = css`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 1.75rem;
`;

export function FieldGroup({ className, ...props }: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="field-group" css={fieldGroupClass} className={className} {...props} />;
}

const fieldBase = css`
  display: flex;
  width: 100%;
  gap: 0.75rem;
  &[data-invalid='true'],
  &[data-invalid] {
    color: var(--destructive);
  }
`;

export const fieldVariants = variants(fieldBase, {
  variants: {
    orientation: {
      vertical: css`
        flex-direction: column;
        & > * {
          width: 100%;
        }
      `,
      horizontal: css`
        flex-direction: row;
        align-items: center;
      `,
      responsive: css`
        flex-direction: column;
        & > * {
          width: 100%;
        }
      `,
    },
  },
  defaultVariants: { orientation: 'vertical' },
});

/**
 * Base UI `Field.Root`. Provides the labeling and validation context that
 * `FieldLabel`, `FieldDescription`, `FieldError`, and any Base UI form
 * control placed inside it (e.g. `Input` from `./Input`) hook into: label
 * association and `aria-describedby` are wired automatically, and validation
 * state is exposed via `data-valid` / `data-invalid` / `data-touched` /
 * `data-dirty` / `data-filled` attributes on every part.
 */
export function Field({
  className,
  orientation = 'vertical',
  ...props
}: WithClassName<React.ComponentProps<typeof FieldPrimitive.Root>> & {
  orientation?: 'vertical' | 'horizontal' | 'responsive',
}): React.ReactNode {
  return (
    <FieldPrimitive.Root
      role="group"
      data-slot="field"
      data-orientation={orientation}
      css={fieldVariants({ orientation })}
      className={className}
      {...props}
    />
  );
}

const fieldContentClass = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.25rem;
  line-height: 1.375;
`;

export function FieldContent({ className, ...props }: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="field-content" css={fieldContentClass} className={className} {...props} />;
}

const fieldLabelClass = css`
  display: flex;
  width: fit-content;
  gap: 0.5rem;
  line-height: 1.375;
`;

/**
 * Base UI `Field.Label` rendered through the shared `Label`. Inside a
 * `Field` it associates with the control automatically; an explicit
 * `htmlFor` still wins when provided.
 */
export function FieldLabel({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof FieldPrimitive.Label>>): React.ReactNode {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      render={<Label />}
      css={fieldLabelClass}
      className={className}
      {...props}
    />
  );
}

const fieldTitleClass = css`
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.375;
  font-weight: 500;
`;

export function FieldTitle({ className, ...props }: React.ComponentProps<'div'>): React.ReactNode {
  return <div data-slot="field-label" css={fieldTitleClass} className={className} {...props} />;
}

const fieldDescriptionClass = css`
  text-align: left;
  font-size: 0.875rem;
  line-height: 1.5;
  font-weight: 400;
  color: var(--muted-foreground);
  & > a {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  & > a:hover {
    color: var(--primary);
  }
`;

export function FieldDescription({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof FieldPrimitive.Description>>): React.ReactNode {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      css={fieldDescriptionClass}
      className={className}
      {...props}
    />
  );
}

const fieldSeparatorClass = css`
  position: relative;
  margin: -0.5rem 0;
  height: 1.25rem;
  font-size: 0.875rem;
`;

const fieldSeparatorLineClass = css`
  position: absolute;
  inset: 0;
  top: 50%;
`;

const fieldSeparatorContentClass = css`
  position: relative;
  margin: 0 auto;
  display: block;
  width: fit-content;
  background-color: var(--background);
  padding: 0 0.5rem;
  color: var(--muted-foreground);
`;

export function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & { children?: React.ReactNode }): React.ReactNode {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      css={fieldSeparatorClass}
      className={className}
      {...props}
    >
      <Separator css={fieldSeparatorLineClass} />
      {children && (
        <span css={fieldSeparatorContentClass} data-slot="field-separator-content">
          {children}
        </span>
      )}
    </div>
  );
}

const fieldErrorClass = css`
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--destructive);
`;

const fieldErrorListClass = css`
  margin-left: 1rem;
  display: flex;
  list-style: disc;
  flex-direction: column;
  gap: 0.25rem;
`;

/**
 * Base UI `Field.Error`. Must be rendered inside a `Field` (like every
 * `Field.*` part). With explicit `children` or an `errors` array it always
 * renders and is announced via the control's `aria-describedby`. Without
 * explicit content it falls back to Base UI's own behavior: showing native
 * or `validate` errors when the field is invalid, and nothing otherwise.
 */
export function FieldError({
  className,
  children,
  errors,
  match,
  ...props
}: WithClassName<React.ComponentProps<typeof FieldPrimitive.Error>> & {
  errors?: Array<{ message?: string } | undefined>,
}): React.ReactNode {
  const content = useMemo(() => {
    if (children) return children;
    if (!errors?.length) return null;
    const unique = [...new Map(errors.map(error => [error?.message, error])).values()];
    if (unique.length === 1) return unique[0]?.message;
    return (
      <ul css={fieldErrorListClass}>
        {unique.map(
          (error, index) => error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  return (
    <FieldPrimitive.Error
      role="alert"
      data-slot="field-error"
      match={content ? true : match}
      css={fieldErrorClass}
      className={className}
      {...props}
      {...(content != null ? { children: content } : {})}
    />
  );
}
