import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

import { cropImage, CropDialogHost } from '../CropDialog';

function mockRect({ left, top, width, height }) {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON() {
      return this;
    },
  };
}

describe('cropImage / CropDialogHost', () => {
  let drawImage;

  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    drawImage = jest.fn();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb, type) {
      cb(new Blob(['cropped-bytes'], { type: type || 'image/png' }));
    });

    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      configurable: true,
      value: 200,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to resolving with the original file when no host is mounted', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await expect(cropImage(file)).resolves.toBe(file);
  });

  it('renders the crop dialog with the file loaded into an image element', async () => {
    render(<CropDialogHost />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    act(() => {
      cropImage(file);
    });

    expect(await screen.findByText('Crop image')).toBeInTheDocument();
    expect(screen.getByTestId('crop-image')).toHaveAttribute('src', 'blob:mock-url');
  });

  it('resolves with the original file when "Use original" is clicked', async () => {
    render(<CropDialogHost />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    const resolved = jest.fn();
    act(() => {
      cropImage(file).then(resolved);
    });

    expect(await screen.findByText('Crop image')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Use original'));

    await waitFor(() => expect(resolved).toHaveBeenCalledWith(file));
  });

  it('resolves with null when the dialog is cancelled', async () => {
    render(<CropDialogHost />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    const resolved = jest.fn();
    act(() => {
      cropImage(file).then(resolved);
    });

    expect(await screen.findByText('Crop image')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(resolved).toHaveBeenCalledWith(null));
  });

  it('"Continue" with no drawn selection resolves with the original file (no crop)', async () => {
    render(<CropDialogHost />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    const resolved = jest.fn();
    act(() => {
      cropImage(file).then(resolved);
    });

    expect(await screen.findByText('Crop image')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => expect(resolved).toHaveBeenCalledWith(file));
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('dragging a selection on the image and confirming resolves with a new cropped File', async () => {
    render(<CropDialogHost />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    const resolved = jest.fn();
    act(() => {
      cropImage(file).then(resolved);
    });

    expect(await screen.findByText('Crop image')).toBeInTheDocument();

    const stage = screen.getByTestId('crop-stage');
    const image = screen.getByTestId('crop-image');
    jest
      .spyOn(stage, 'getBoundingClientRect')
      .mockReturnValue(mockRect({ left: 0, top: 0, width: 200, height: 100 }));
    jest
      .spyOn(image, 'getBoundingClientRect')
      .mockReturnValue(mockRect({ left: 0, top: 0, width: 200, height: 100 }));

    fireEvent.mouseDown(stage, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(stage, { clientX: 100, clientY: 60 });
    fireEvent.mouseUp(stage, { clientX: 100, clientY: 60 });

    expect(screen.getByTestId('crop-selection')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Crop & use selection'));

    await waitFor(() => expect(resolved).toHaveBeenCalled());
    const result = resolved.mock.calls[0][0];
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe(file.name);
    expect(result.type).toBe('image/png');
    expect(drawImage).toHaveBeenCalledTimes(1);

    // Stage is 200x100 displayed for a 400x200 natural image -> scale factor 2.
    // Selection drawn from (10,10) to (100,60) in displayed px scales to a
    // (20,20)-(200,120) rectangle in natural image pixels.
    const [, sx, sy, sw, sh] = drawImage.mock.calls[0];
    expect(sx).toBeCloseTo(20);
    expect(sy).toBeCloseTo(20);
    expect(sw).toBeCloseTo(180);
    expect(sh).toBeCloseTo(100);
  });
});
