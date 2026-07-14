import { describe, expect, it } from 'vitest';

import { registerWidget } from '../../../../lib/registry';
import { RichtextValue, createRichtextValue, registerMapper, markdownMapper } from '../../../../../lib/richtext/index';
import { getWidget } from '../EditorPreviewPane';

import type React from 'react';
import type { CmsEntryField } from '../../../../../lib/util/index';

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

/**
 * DCMS-538: `EditorPreview`'s top-level `fields.filter(isVisible)` hid a
 * top-level `widget: 'hidden'` field, but the recursion used by nested
 * list/object previews (`widgetFor` -> `getSingleNested` -> `getWidget`, and
 * the `widgetsFor` API exposed to custom preview templates) funnels every
 * call, at every nesting depth, through this same `getWidget`. Without a
 * guard there, `resolveWidget('hidden')` falls back to the 'unknown' widget
 * and leaks "No preview for widget 'hidden'." into the preview iframe for a
 * hidden field nested inside list -> object -> list.
 */
describe('PreviewPane.getWidget hidden widget filtering (DCMS-538)', () => {
  const baseProps = {
    getAsset: () => ({ url: '', path: '' }),
    entry: {} as any,
  } as any;

  it('returns null for a hidden field instead of resolving the "unknown widget" fallback preview', () => {
    const field = { name: 'secret', widget: 'hidden' } as CmsEntryField;

    const result = getWidget(field, 'hidden', {}, baseProps);

    expect(result).toBeNull();
  });

  it('returns null for a hidden field even when it carries a value nested via list/object recursion', () => {
    // Mirrors the `list -> object -> list -> hidden` shape from the DCMS-538
    // repro: getWidget is the single choke point every recursive call site
    // (widgetFor, getSingleNested, widgetsFor) funnels through regardless of
    // nesting depth, so this call is representative of the deeply-nested case.
    const field = { name: 'hidden', widget: 'hidden' } as CmsEntryField;

    const result = getWidget(field, 'hidden', {}, baseProps, 0);

    expect(result).toBeNull();
  });

  it('still resolves a preview component for a visible field (regression guard)', () => {
    registerWidget({
      name: 'dcms-538-visible',
      controlComponent: NoopControl,
      previewComponent: NoopPreview,
    });

    const field = { name: 'title', widget: 'dcms-538-visible' } as CmsEntryField;

    const result = getWidget(field, 'hello', {}, baseProps);

    expect(result).not.toBeNull();
  });
});
