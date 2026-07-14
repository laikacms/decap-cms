import { describe, expect, it } from 'vitest';

import { registerWidget } from '@/core/lib/registry';
import { RichtextValue, createRichtextValue, registerMapper, markdownMapper } from '@/lib/richtext/index';
import { getWidget } from '@/core/components/Editor/EditorPreviewPane/EditorPreviewPane';

import type React from 'react';
import type { CmsEntryField } from '@/lib/util/index';

registerMapper(markdownMapper);

function NoopControl() {
  return null;
}

function NoopPreview() {
  return null;
}

/**
 * DCMS-455: `EditorPreviewPane.getWidget`'s `valueIsInMap` heuristic treats
 * any non-array object value as a nested-fields map and unwraps it to
 * `value[field.name]`, unless the widget opts out via `allowMapValue: true`.
 * A `RichtextValue` class instance is an object, so widgets holding one
 * (markdown, code) must set `allowMapValue: true` or their preview receives
 * `undefined` instead of the instance.
 */
describe('EditorPreviewPane.getWidget valueIsInMap heuristic', () => {
  const baseProps = {
    getAsset: () => ({ url: '', path: '' }),
    entry: {} as any,
  } as any;

  it('passes a RichtextValue instance through unchanged when the widget sets allowMapValue: true', () => {
    registerWidget({
      name: 'richtext-test-allow-map',
      controlComponent: NoopControl,
      previewComponent: NoopPreview,
      allowMapValue: true,
    });

    const field = { name: 'body', widget: 'richtext-test-allow-map' } as CmsEntryField;
    const value = createRichtextValue('# Hello', { hint: 'markdown' });

    const element = getWidget(field, value, {}, baseProps) as React.ReactElement<{
      value: unknown;
    }>;

    expect(element).not.toBeNull();
    expect(element!.props.value).toBe(value);
    expect(element!.props.value).toBeInstanceOf(RichtextValue);
  });

  it('unwraps the value to undefined for a plain-object-holding widget without allowMapValue (regression guard)', () => {
    registerWidget({
      name: 'richtext-test-no-allow-map',
      controlComponent: NoopControl,
      previewComponent: NoopPreview,
    });

    const field = { name: 'body', widget: 'richtext-test-no-allow-map' } as CmsEntryField;
    const value = createRichtextValue('# Hello', { hint: 'markdown' });

    const element = getWidget(field, value, {}, baseProps) as React.ReactElement<{
      value: unknown;
    }>;

    expect(element).not.toBeNull();
    // Reproduces the bug: without `allowMapValue`, a class instance is
    // misclassified as a nested-fields map and stripped to
    // `value[field.name]`, which is `undefined` on a RichtextValue.
    expect(element!.props.value).toBeUndefined();
  });
});
