import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

import LaikaEditorViewControls from '@/laika-app/LaikaEditorViewControls';

const baseProps = {
  i18nEnabled: true,
  i18nVisible: false,
  onToggleI18n: vi.fn(),
  previewEnabled: true,
  previewVisible: false,
  onTogglePreview: vi.fn(),
  scrollSyncEnabled: false,
  scrollSyncVisible: false,
  onToggleScrollSync: vi.fn(),
};

describe('LaikaEditorViewControls', () => {
  it('returns null when no toggles are available', () => {
    const { container } = render(
      <LaikaEditorViewControls
        {...baseProps}
        i18nEnabled={false}
        previewEnabled={false}
        scrollSyncVisible={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows i18n + preview toggles when enabled', () => {
    const { getByLabelText } = render(<LaikaEditorViewControls {...baseProps} />);
    expect(getByLabelText('editor.editorInterface.toggleI18n')).toBeInTheDocument();
    expect(getByLabelText('editor.editorInterface.togglePreview')).toBeInTheDocument();
  });

  it('fires onTogglePreview when preview toggle clicked', () => {
    const onTogglePreview = vi.fn();
    const { getByLabelText } = render(
      <LaikaEditorViewControls {...baseProps} onTogglePreview={onTogglePreview} />,
    );
    fireEvent.click(getByLabelText('editor.editorInterface.togglePreview'));
    expect(onTogglePreview).toHaveBeenCalledTimes(1);
  });

  it('shows scroll-sync toggle when scrollSyncVisible is true', () => {
    const { getByLabelText } = render(
      <LaikaEditorViewControls {...baseProps} scrollSyncVisible={true} />,
    );
    expect(getByLabelText('editor.editorInterface.toggleScrollSync')).toBeInTheDocument();
  });
});
