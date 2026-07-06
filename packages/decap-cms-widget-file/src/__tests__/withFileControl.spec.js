import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Map } from 'immutable';

import withFileControl from '../withFileControl';

const FileControl = withFileControl();

function t(key) {
  return key;
}

function noop() {}

function renderControl({ value, mediaLibrary, allowMultiple, onOpenMediaLibrary = noop } = {}) {
  const field = Map({
    name: 'file',
    widget: 'file',
    ...(allowMultiple !== undefined ? { allow_multiple: allowMultiple } : {}),
    ...(mediaLibrary ? { media_library: Map(mediaLibrary) } : {}),
  });

  return render(
    <FileControl
      field={field}
      getAsset={() => null}
      mediaPaths={Map()}
      onAddAsset={noop}
      onChange={noop}
      onRemoveInsertedMedia={noop}
      onOpenMediaLibrary={onOpenMediaLibrary}
      onClearMediaControl={noop}
      onRemoveMediaControl={noop}
      classNameWrapper="control"
      value={value}
      t={t}
    />,
  );
}

describe('withFileControl', () => {
  describe('allowsMultiple / media_library.allow_multiple', () => {
    it('renders single-select labels and shows Replace URL when allow_multiple is not set', () => {
      renderControl({ value: '' });

      expect(screen.getByText('editor.editorWidgets.file.choose')).toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.chooseUrl')).toBeInTheDocument();
    });

    it('renders single-select labels for an existing value when allow_multiple is not set', () => {
      renderControl({ value: 'file.pdf' });

      expect(screen.getByText('editor.editorWidgets.file.chooseDifferent')).toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.replaceUrl')).toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.remove')).toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.file.removeAll')).not.toBeInTheDocument();
    });

    it('renders multi-select labels and hides Replace URL when field.media_library.allow_multiple is true', () => {
      renderControl({ value: '', mediaLibrary: { allow_multiple: true } });

      expect(screen.getByText('editor.editorWidgets.file.chooseMultiple')).toBeInTheDocument();
    });

    it('renders multi-select labels, hides Replace URL, and shows Remove All for an existing value when field.media_library.allow_multiple is true', () => {
      renderControl({ value: 'file.pdf', mediaLibrary: { allow_multiple: true } });

      expect(screen.getByText('editor.editorWidgets.file.addMore')).toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.file.replaceUrl')).not.toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.removeAll')).toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.file.remove')).not.toBeInTheDocument();
    });

    it('opens the media library in single-select mode when allow_multiple is not set anywhere (DCMS-387)', () => {
      const onOpenMediaLibrary = jest.fn();
      renderControl({ value: '', onOpenMediaLibrary });

      fireEvent.click(screen.getByText('editor.editorWidgets.file.choose'));

      expect(onOpenMediaLibrary).toHaveBeenCalledWith(
        expect.objectContaining({ allowMultiple: false }),
      );
    });

    it('does not treat the legacy field.media_library.config.multiple key as multi-select', () => {
      renderControl({
        value: 'file.pdf',
        mediaLibrary: { config: Map({ multiple: true }) },
      });

      expect(screen.getByText('editor.editorWidgets.file.chooseDifferent')).toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.replaceUrl')).toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.remove')).toBeInTheDocument();
    });
  });

  describe('top-level field.allow_multiple', () => {
    it('renders multi-select labels when allow_multiple is set directly on the field', () => {
      renderControl({ value: '', allowMultiple: true });

      expect(screen.getByText('editor.editorWidgets.file.chooseMultiple')).toBeInTheDocument();
    });

    it('renders single-select labels when allow_multiple:false is set directly on the field, even if media_library.allow_multiple is true', () => {
      renderControl({
        value: 'file.pdf',
        allowMultiple: false,
        mediaLibrary: { allow_multiple: true },
      });

      expect(screen.getByText('editor.editorWidgets.file.chooseDifferent')).toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.replaceUrl')).toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.remove')).toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.file.removeAll')).not.toBeInTheDocument();
    });
  });
});
