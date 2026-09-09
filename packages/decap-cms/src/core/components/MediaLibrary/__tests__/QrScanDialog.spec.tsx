import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
  translate: () => (Component: React.ComponentType<any>) => (props: any) => (
    <Component
      {...props}
      t={(key: string) => key}
    />
  ),
}));

const decodeQrFromImageData = vi.fn();
const decodeQrFromImageSource = vi.fn();

vi.mock('@/core/components/MediaLibrary/qrScan', () => ({
  decodeQrFromImageData: (...args: unknown[]) => decodeQrFromImageData(...args),
  decodeQrFromImageSource: (...args: unknown[]) => decodeQrFromImageSource(...args),
}));

import QrScanDialog from '@/core/components/MediaLibrary/QrScanDialog';

const t = (key: string) => key;

function fakeStream(): MediaStream {
  const track = { stop: vi.fn() };
  return {
    getTracks: () => [track],
  } as unknown as MediaStream;
}

describe('QrScanDialog', () => {
  beforeEach(() => {
    if (!document.getElementById('nc-root')) {
      const root = document.createElement('div');
      root.id = 'nc-root';
      document.body.appendChild(root);
    }
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    decodeQrFromImageData.mockReset();
    decodeQrFromImageSource.mockReset();
  });

  it('shows a camera-unsupported message but still offers the upload path when getUserMedia is missing', async () => {
    render(<QrScanDialog mediaDevices={{}} onConfirm={vi.fn()} onCancel={vi.fn()} t={t} />);

    await screen.findByText('mediaLibrary.qrScanDialog.cameraUnsupported');
    expect(screen.getByText('mediaLibrary.qrScanDialog.uploadLabel')).not.toBeDisabled();
  });

  it('shows a permission error when getUserMedia rejects', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));

    render(<QrScanDialog mediaDevices={{ getUserMedia }} onConfirm={vi.fn()} onCancel={vi.fn()} t={t} />);

    await screen.findByText('mediaLibrary.qrScanDialog.permissionError');
  });

  it('polls the live camera stream and calls onConfirm once a frame decodes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const stream = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    decodeQrFromImageData.mockResolvedValue('https://example.com/scanned.png');
    const onConfirm = vi.fn();

    render(<QrScanDialog mediaDevices={{ getUserMedia }} onConfirm={onConfirm} onCancel={vi.fn()} t={t} />);

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    const video = screen.getByTestId('qr-scan-video') as HTMLVideoElement;
    Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 480, configurable: true });

    // See the sibling "keep failing to decode" test for why this loops
    // instead of a single fixed-size jump.
    for (let i = 0; i < 10 && onConfirm.mock.calls.length === 0; i += 1) {
      await vi.advanceTimersByTimeAsync(350);
    }

    expect(onConfirm).toHaveBeenCalledWith('https://example.com/scanned.png');
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('does not call onConfirm while frames keep failing to decode', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const stream = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    decodeQrFromImageData.mockResolvedValue(null);
    const onConfirm = vi.fn();

    render(<QrScanDialog mediaDevices={{ getUserMedia }} onConfirm={onConfirm} onCancel={vi.fn()} t={t} />);

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    const video = screen.getByTestId('qr-scan-video') as HTMLVideoElement;
    Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 480, configurable: true });

    // The polling effect only mounts once `isReady` commits after the
    // getUserMedia promise resolves, which can land a tick or two after
    // `waitFor` above returns. Advance in a loop rather than one big jump
    // so the first scan interval is guaranteed to have fired.
    for (let i = 0; i < 10 && decodeQrFromImageData.mock.calls.length === 0; i += 1) {
      await vi.advanceTimersByTimeAsync(350);
    }

    expect(onConfirm).not.toHaveBeenCalled();
    expect(decodeQrFromImageData).toHaveBeenCalled();
  });

  it('decodes an uploaded image and calls onConfirm on success', async () => {
    decodeQrFromImageSource.mockResolvedValue('https://example.com/from-upload.png');
    const onConfirm = vi.fn();

    render(<QrScanDialog mediaDevices={{}} onConfirm={onConfirm} onCancel={vi.fn()} t={t} />);

    const file = new File(['fake'], 'code.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('https://example.com/from-upload.png'));
  });

  it('shows a decode error and does not call onConfirm when the uploaded image has no QR code', async () => {
    decodeQrFromImageSource.mockResolvedValue(null);
    const onConfirm = vi.fn();

    render(<QrScanDialog mediaDevices={{}} onConfirm={onConfirm} onCancel={vi.fn()} t={t} />);

    const file = new File(['fake'], 'code.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await screen.findByText('mediaLibrary.qrScanDialog.decodeError');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('stops the stream and calls onCancel when Cancel is clicked', async () => {
    const stream = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const onCancel = vi.fn();

    render(<QrScanDialog mediaDevices={{ getUserMedia }} onConfirm={vi.fn()} onCancel={onCancel} t={t} />);

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('mediaLibrary.qrScanDialog.cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('stops the stream on unmount', async () => {
    const stream = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);

    const { unmount } = render(
      <QrScanDialog mediaDevices={{ getUserMedia }} onConfirm={vi.fn()} onCancel={vi.fn()} t={t} />,
    );

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    unmount();

    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });
});
