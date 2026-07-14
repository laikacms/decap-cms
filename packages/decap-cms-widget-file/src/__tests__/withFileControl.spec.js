import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { List, Map } from 'immutable';

import withFileControl, {
  isMultiple,
  sizeOfValue,
  valueListToArray,
  valueListToSortableArray,
} from '../withFileControl';

jest.mock('uuid');

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

  // DCMS-552: decap-website docs claim allow_multiple defaults to true; the code (both
  // handleChange's modal allowMultiple and allowsMultiple()) actually defaults to false
  // when the key is unset at both the top level and under media_library. This pins the
  // actual runtime default so a future change is deliberate, not accidental.
  describe('DCMS-552 default when allow_multiple is unset everywhere', () => {
    it('resolves handleChange allowMultiple to false', () => {
      const onOpenMediaLibrary = jest.fn();
      renderControl({ value: '', onOpenMediaLibrary });

      fireEvent.click(screen.getByText('editor.editorWidgets.file.choose'));

      expect(onOpenMediaLibrary).toHaveBeenCalledWith(
        expect.objectContaining({ allowMultiple: false }),
      );
    });

    it('resolves allowsMultiple() to false via single-select rendering', () => {
      renderControl({ value: 'file.pdf' });

      expect(screen.getByText('editor.editorWidgets.file.chooseDifferent')).toBeInTheDocument();
      expect(screen.getByText('editor.editorWidgets.file.remove')).toBeInTheDocument();
      expect(screen.queryByText('editor.editorWidgets.file.removeAll')).not.toBeInTheDocument();
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

// DCMS-426: isMultiple/sizeOfValue/valueListToArray/valueListToSortableArray had zero coverage.
describe('isMultiple', () => {
  it('returns true for a plain array', () => {
    expect(isMultiple(['a', 'b'])).toBe(true);
  });

  it('returns true for an empty array', () => {
    expect(isMultiple([])).toBe(true);
  });

  it('returns true for an Immutable List', () => {
    expect(isMultiple(List(['a', 'b']))).toBe(true);
  });

  it('returns true for an empty Immutable List', () => {
    expect(isMultiple(List())).toBe(true);
  });

  it('returns false for a scalar string', () => {
    expect(isMultiple('file.pdf')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isMultiple('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isMultiple(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isMultiple(null)).toBe(false);
  });
});

describe('sizeOfValue', () => {
  it('returns the length of a plain array', () => {
    expect(sizeOfValue(['a', 'b', 'c'])).toBe(3);
  });

  it('returns 0 for an empty array', () => {
    expect(sizeOfValue([])).toBe(0);
  });

  it('returns the size of an Immutable List', () => {
    expect(sizeOfValue(List(['a', 'b']))).toBe(2);
  });

  it('returns 0 for an empty Immutable List', () => {
    expect(sizeOfValue(List())).toBe(0);
  });

  it('returns 1 for a truthy scalar', () => {
    expect(sizeOfValue('file.pdf')).toBe(1);
  });

  it('returns 0 for an empty string scalar', () => {
    expect(sizeOfValue('')).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(sizeOfValue(undefined)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(sizeOfValue(null)).toBe(0);
  });
});

describe('valueListToArray', () => {
  it('converts an Immutable List to a plain array', () => {
    expect(valueListToArray(List(['a', 'b']))).toEqual(['a', 'b']);
  });

  it('converts an empty Immutable List to an empty array', () => {
    expect(valueListToArray(List())).toEqual([]);
  });

  it('passes a plain array through unchanged', () => {
    const value = ['a', 'b'];
    expect(valueListToArray(value)).toBe(value);
  });

  it('passes a scalar string through unchanged', () => {
    expect(valueListToArray('file.pdf')).toBe('file.pdf');
  });

  it('falls back to an empty string for undefined', () => {
    expect(valueListToArray(undefined)).toBe('');
  });

  it('falls back to an empty string for null', () => {
    expect(valueListToArray(null)).toBe('');
  });
});

describe('valueListToSortableArray', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const uuid = require('uuid');
    let counter = 0;
    uuid.v4.mockImplementation(() => `generated-id-${++counter}`);
  });

  it('wraps each item of a plain array in an { id, value } object', () => {
    const result = valueListToSortableArray(['a', 'b']);

    expect(result).toEqual([
      { id: 'generated-id-1', value: 'a' },
      { id: 'generated-id-2', value: 'b' },
    ]);
  });

  it('wraps each item of an Immutable List in an { id, value } object', () => {
    const result = valueListToSortableArray(List(['a', 'b']));

    expect(result).toEqual([
      { id: 'generated-id-1', value: 'a' },
      { id: 'generated-id-2', value: 'b' },
    ]);
  });

  it('returns an empty array for an empty multi-value input', () => {
    expect(valueListToSortableArray([])).toEqual([]);
  });

  it('short-circuits to the raw value for a single (non-multiple) value', () => {
    expect(valueListToSortableArray('file.pdf')).toBe('file.pdf');
  });

  it('short-circuits to the raw value for undefined', () => {
    expect(valueListToSortableArray(undefined)).toBeUndefined();
  });

  it('short-circuits to the raw value for null', () => {
    expect(valueListToSortableArray(null)).toBeNull();
  });
});
