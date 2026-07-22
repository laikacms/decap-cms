import { useMemo } from 'react';

import { normalizeBlockData } from '@/lib/richtext';
import ObjectControl from '@/widgets/object/ObjectControl';

import type { BlockFormRenderProps, BlocksConfig } from '@/lib/richtext';
import type { ObjectControlProps } from '@/widgets/object/ObjectControl';
import type { ComponentType, ReactNode } from 'react';

/**
 * The decap plumbing every widget control receives from
 * `EditorControlPane/Widget.tsx`; forwarded here so block prop forms reuse
 * the real widget tree (including nested richtext fields).
 */
export interface BlockFormDeps {
  editorControl: ComponentType<Record<string, unknown>>;
  resolveWidget: (name: string) => Record<string, unknown>;
  clearFieldErrors: (uniqueFieldId: string) => void;
  t: ObjectControlProps['t'];
  locale?: string;
  classNameWrapper?: string;
  /**
   * Threaded from `EditorControlPane/Widget.tsx` down through the richtext
   * field's own `onValidateObject`; forwarded to the block's `ObjectControl`
   * so a required sub-field left empty registers its error against the
   * entry-level validation state the same way a top-level object field's
   * nested fields do, instead of validating in isolation.
   */
  onValidateObject?: ObjectControlProps['onValidateObject'];
}

type BlockFormProps = BlockFormRenderProps & BlockFormDeps;

/**
 * Inline prop form for one custom block: mounts `ObjectControl` over the
 * block's `fields` with the injected (Redux-connected) `editorControl`.
 * The Redux coupling stays behind this seam; the editor itself only sees
 * `renderBlockForm`.
 */
export function BlockForm({
  definition,
  value,
  onChange,
  editorControl,
  resolveWidget,
  clearFieldErrors,
  t,
  locale,
  classNameWrapper,
  onValidateObject,
}: BlockFormProps): ReactNode {
  const field = useMemo(
    () => ({
      name: definition.id,
      label: definition.label ?? definition.id,
      widget: 'object',
      fields: definition.fields,
    }),
    [definition],
  );

  return (
    <ObjectControl
      field={field as ObjectControlProps['field']}
      value={value}
      onChangeObject={(childField, newValue) =>
        // A nested richtext field hands back a RichtextValue proxy;
        // normalize resolves it to its Portable Text array so block data
        // stays plain JSON (and rich content stays PT end-to-end).
        onChange(normalizeBlockData({ ...value, [childField.name]: newValue }))}
      editorControl={editorControl}
      resolveWidget={resolveWidget}
      clearFieldErrors={clearFieldErrors}
      classNameWrapper={classNameWrapper ?? ''}
      onValidateObject={onValidateObject}
      t={t}
      locale={locale}
    />
  );
}

/** Bind the decap plumbing once; the editor calls the result per block. */
export function makeBlockFormRenderer(
  deps: BlockFormDeps,
): NonNullable<BlocksConfig['renderBlockForm']> {
  return function renderBlockForm(props: BlockFormRenderProps) {
    return <BlockForm {...props} {...deps} />;
  };
}
