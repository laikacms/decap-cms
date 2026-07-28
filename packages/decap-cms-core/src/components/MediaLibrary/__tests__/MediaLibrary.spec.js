import { fromJS } from 'immutable';

import { MediaLibrary } from '../MediaLibrary';

jest.mock('decap-cms-ui-default', () => {
  const actual = jest.requireActual('decap-cms-ui-default');
  return {
    ...actual,
    cropImage: jest.fn(),
  };
});

// eslint-disable-next-line import/first, import/order
import { cropImage } from 'decap-cms-ui-default';

function makeInstance(overrides = {}) {
  const props = {
    files: [],
    config: fromJS({}),
    privateUpload: false,
    forImage: true,
    field: fromJS({ name: 'hero', widget: 'image' }),
    loadMedia: jest.fn(),
    persistMedia: jest.fn().mockResolvedValue(undefined),
    deleteMedia: jest.fn(),
    insertMedia: jest.fn(),
    closeMediaLibrary: jest.fn(),
    t: jest.fn(key => key),
    ...overrides,
  };
  return new MediaLibrary(props);
}

function makeFile(name, type) {
  return new File(['fake-bytes'], name, { type });
}

function makeEvent(file) {
  return {
    persist: jest.fn(),
    stopPropagation: jest.fn(),
    preventDefault: jest.fn(),
    dataTransfer: { files: [file] },
    target: { value: 'x' },
  };
}

describe('MediaLibrary handlePersist crop-before-upload gating (DCMS-1424)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call cropImage when the field has no crop_before_upload set', async () => {
    const instance = makeInstance({ field: fromJS({ name: 'hero', widget: 'image' }) });
    const file = makeFile('photo.png', 'image/png');

    await instance.handlePersist(makeEvent(file));

    expect(cropImage).not.toHaveBeenCalled();
    expect(instance.props.persistMedia).toHaveBeenCalledWith(file, {
      privateUpload: false,
      field: instance.props.field,
    });
  });

  it('does not call cropImage when forImage is false (file widget)', async () => {
    const instance = makeInstance({
      forImage: false,
      field: fromJS({ name: 'attachment', widget: 'file', crop_before_upload: true }),
    });
    const file = makeFile('doc.png', 'image/png');

    await instance.handlePersist(makeEvent(file));

    expect(cropImage).not.toHaveBeenCalled();
    expect(instance.props.persistMedia).toHaveBeenCalledWith(file, expect.any(Object));
  });

  it('does not call cropImage for a non-image mime type even when crop_before_upload is set', async () => {
    const instance = makeInstance({
      field: fromJS({ name: 'hero', widget: 'image', crop_before_upload: true }),
    });
    const file = makeFile('weird.svgz', 'application/octet-stream');

    await instance.handlePersist(makeEvent(file));

    expect(cropImage).not.toHaveBeenCalled();
    expect(instance.props.persistMedia).toHaveBeenCalledWith(file, expect.any(Object));
  });

  it('calls cropImage and persists the cropped file when crop_before_upload is true and the file is an image', async () => {
    const originalFile = makeFile('photo.png', 'image/png');
    const croppedFile = makeFile('photo.png', 'image/png');
    cropImage.mockResolvedValueOnce(croppedFile);

    const instance = makeInstance({
      field: fromJS({ name: 'hero', widget: 'image', crop_before_upload: true }),
    });

    await instance.handlePersist(makeEvent(originalFile));

    expect(cropImage).toHaveBeenCalledWith(originalFile);
    expect(instance.props.persistMedia).toHaveBeenCalledWith(croppedFile, {
      privateUpload: false,
      field: instance.props.field,
    });
  });

  it('aborts the upload (does not call persistMedia) when the crop dialog is cancelled', async () => {
    cropImage.mockResolvedValueOnce(null);

    const instance = makeInstance({
      field: fromJS({ name: 'hero', widget: 'image', crop_before_upload: true }),
    });
    const file = makeFile('photo.png', 'image/png');
    const event = makeEvent(file);

    await instance.handlePersist(event);

    expect(cropImage).toHaveBeenCalledWith(file);
    expect(instance.props.persistMedia).not.toHaveBeenCalled();
    expect(event.target.value).toBeNull();
  });

  it('still enforces max_file_size before any crop step runs', async () => {
    const instance = makeInstance({
      config: fromJS({ max_file_size: 10 }),
      field: fromJS({ name: 'hero', widget: 'image', crop_before_upload: true }),
    });
    const file = makeFile('photo.png', 'image/png');
    Object.defineProperty(file, 'size', { value: 1000 });

    await instance.handlePersist(makeEvent(file));

    expect(cropImage).not.toHaveBeenCalled();
    expect(instance.props.persistMedia).not.toHaveBeenCalled();
  });
});
