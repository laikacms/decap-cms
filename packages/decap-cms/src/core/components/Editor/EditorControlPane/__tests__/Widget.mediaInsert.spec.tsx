/**
 * DCMS-2476: picking an asset in the Images picker and clicking "Choose
 * selected" closed the modal but never wrote the asset into the field. The
 * media library reducer stored the path in `controlMedia[controlID]`, but
 * `Widget.shouldComponentUpdate` ignored `mediaPaths`, so the image control
 * never re-rendered to commit it via `onChange`.
 *
 * Drives the real `Widget` wrapper around the real image control, with the
 * real media library reducer producing the `mediaPaths` handed back.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MEDIA_INSERT, MEDIA_LIBRARY_OPEN } from '@/core/actions/mediaLibrary';
import Widget from '@/core/components/Editor/EditorControlPane/Widget';
import mediaLibraryReducer from '@/core/reducers/mediaLibrary';
import { DecapCmsWidgetImage } from '@/widgets/image/index';

import type { MediaLibraryAction } from '@/core/actions/mediaLibrary';

type WidgetProps = React.ComponentProps<typeof Widget>;
type MediaLibraryState = ReturnType<typeof mediaLibraryReducer>;

const field = { name: 'image', widget: 'image', label: 'Cover Image' };

function widgetProps(overrides: Partial<WidgetProps>): WidgetProps {
  return {
    controlComponent: DecapCmsWidgetImage.controlComponent as unknown as WidgetProps['controlComponent'],
    field,
    value: '',
    mediaPaths: {},
    onChange: vi.fn(),
    onOpenMediaLibrary: vi.fn(),
    onClearMediaControl: vi.fn(),
    onRemoveMediaControl: vi.fn(),
    onRemoveInsertedMedia: vi.fn(),
    onPersistMedia: vi.fn(),
    onAddAsset: vi.fn(),
    getAsset: () => '',
    setActiveStyle: vi.fn(),
    setInactiveStyle: vi.fn(),
    classNameWrapper: '',
    classNameWidget: '',
    classNameWidgetActive: '',
    classNameLabel: '',
    classNameLabelActive: '',
    uniqueFieldId: 'image-field',
    parentIds: [],
    t: (key: string) => key,
    ...overrides,
  } as WidgetProps;
}

describe('Widget media library insert (DCMS-2476)', () => {
  it.each([
    ['an existing library asset', '/assets/uploads/nf-logo.png'],
    ['a freshly uploaded draft asset', '/assets/uploads/moby-dick.jpg'],
  ])('commits %s picked via "Choose selected" into the field', async (_label, mediaPath) => {
    const user = userEvent.setup();
    let libraryState = mediaLibraryReducer(undefined, { type: '@@INIT' } as unknown as MediaLibraryAction);
    const dispatch = (action: { type: string, payload?: unknown }) => {
      libraryState = mediaLibraryReducer(libraryState, action as MediaLibraryAction) as MediaLibraryState;
    };
    const onChange = vi.fn();
    const onOpenMediaLibrary = vi.fn((payload: Record<string, unknown>) =>
      dispatch({ type: MEDIA_LIBRARY_OPEN, payload }),
    );

    const props = widgetProps({ onChange, onOpenMediaLibrary });
    const { rerender } = render(<Widget {...props} />);

    await user.click(screen.getByRole('button', { name: /editor\.editorWidgets\.image\.choose\b/ }));
    expect(onOpenMediaLibrary).toHaveBeenCalledTimes(1);

    dispatch({ type: MEDIA_INSERT, payload: { mediaPath } });
    rerender(<Widget {...props} mediaPaths={libraryState.controlMedia as Record<string, string>} />);

    expect(onChange).toHaveBeenCalledWith(mediaPath);
  });
});
