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

import CaptureDialog from '@/core/components/MediaLibrary/CaptureDialog';

const t = (key: string) => key;

function fakeStream(): MediaStream {
  const track = { stop: vi.fn() };
  return {
    getTracks: () => [track],
  } as unknown as MediaStream;
}

function stubOffscreenCanvas(convertToBlob: ReturnType<typeof vi.fn>) {
  class FakeOffscreenCanvas {
    constructor(public width: number, public height: number) {}
    getContext() {
      return { drawImage: vi.fn() };
    }
    convertToBlob = convertToBlob;
  }
  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
}

describe('CaptureDialog', () => {
  beforeEach(() => {
    if (!document.getElementById('nc-root')) {
      const root = document.createElement('div');
      root.id = 'nc-root';
      document.body.appendChild(root);
    }
    // jsdom's HTMLMediaElement.play() throws "not implemented" by default.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows an unsupported message and disables Capture when the API is missing', async () => {
    render(
      <CaptureDialog mode="camera" mediaDevices={{}} onConfirm={vi.fn()} onCancel={vi.fn()} t={t} />,
    );

    await screen.findByText('mediaLibrary.captureDialog.unsupported');
    expect(screen.getByText('mediaLibrary.captureDialog.capture')).toBeDisabled();
  });

  it('shows a permission error when getUserMedia rejects', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));

    render(
      <CaptureDialog
        mode="camera"
        mediaDevices={{ getUserMedia }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        t={t}
      />,
    );

    await screen.findByText('mediaLibrary.captureDialog.permissionError');
    expect(screen.getByText('mediaLibrary.captureDialog.capture')).toBeDisabled();
  });

  it('streams the camera and calls onConfirm with a captured PNG File', async () => {
    const stream = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const outputBlob = new Blob(['frame'], { type: 'image/png' });
    const convertToBlob = vi.fn().mockResolvedValue(outputBlob);
    stubOffscreenCanvas(convertToBlob);

    const onConfirm = vi.fn();

    render(
      <CaptureDialog
        mode="camera"
        mediaDevices={{ getUserMedia }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        t={t}
      />,
    );

    const captureButton = await screen.findByText('mediaLibrary.captureDialog.capture');
    await waitFor(() => expect(captureButton).not.toBeDisabled());

    const video = screen.getByTestId('capture-video') as HTMLVideoElement;
    Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 480, configurable: true });

    fireEvent.click(captureButton);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const [file] = onConfirm.mock.calls[0];
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
    expect(file.name).toMatch(/^camera-capture-\d+\.png$/);
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('uses getDisplayMedia for screen capture mode', async () => {
    const stream = fakeStream();
    const getDisplayMedia = vi.fn().mockResolvedValue(stream);
    const getUserMedia = vi.fn();

    render(
      <CaptureDialog
        mode="screen"
        mediaDevices={{ getUserMedia, getDisplayMedia }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        t={t}
      />,
    );

    await waitFor(() => expect(getDisplayMedia).toHaveBeenCalledTimes(1));
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('stops the stream and calls onCancel when Cancel is clicked', async () => {
    const stream = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const onCancel = vi.fn();

    render(
      <CaptureDialog
        mode="camera"
        mediaDevices={{ getUserMedia }}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        t={t}
      />,
    );

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('mediaLibrary.captureDialog.cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('stops the stream on unmount even if the dialog was not explicitly cancelled', async () => {
    const stream = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);

    const { unmount } = render(
      <CaptureDialog
        mode="camera"
        mediaDevices={{ getUserMedia }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        t={t}
      />,
    );

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    unmount();

    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });
});
