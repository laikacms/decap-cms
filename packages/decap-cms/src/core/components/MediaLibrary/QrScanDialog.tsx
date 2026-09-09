import styled from '@emotion/styled';
import React from 'react';

import { FileUploadButton, Modal } from '@/core/components/UI';
import { buttons, colors } from '@/ui/default/index';
import { decodeQrFromImageData, decodeQrFromImageSource } from './qrScan';

import type { CaptureMediaDevices } from './CaptureDialog';
import type { TranslateFunction } from '@/ui/default/index';

const MAX_DISPLAY_WIDTH = 600;
const MAX_DISPLAY_HEIGHT = 420;

// How often (ms) a live camera frame is drawn to the scan canvas and run
// through the decoder. jsQR's per-frame cost scales with pixel count, so
// this trades a little scan latency for not pegging the main thread on
// every animation frame; 350ms is imperceptible for a "hold the code up to
// the camera" interaction.
const SCAN_INTERVAL_MS = 350;

const DialogBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const Title = styled.h2`
  margin: 0;
`;

const Hint = styled.p`
  margin: 0;
  color: ${colors.text};
  max-width: ${MAX_DISPLAY_WIDTH}px;
  text-align: center;
`;

const Stage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 320px;
  min-height: 180px;
  max-width: ${MAX_DISPLAY_WIDTH}px;
  max-height: ${MAX_DISPLAY_HEIGHT}px;
  background-color: #333;
`;

const StageVideo = styled.video`
  display: block;
  max-width: ${MAX_DISPLAY_WIDTH}px;
  max-height: ${MAX_DISPLAY_HEIGHT}px;
`;

const ErrorMessage = styled.p`
  color: ${colors.errorText};
  max-width: ${MAX_DISPLAY_WIDTH}px;
  text-align: center;
`;

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CancelButton = styled.button`
  ${buttons.button};
  ${buttons.default};
  ${buttons.gray};
`;

const UploadButton = styled(FileUploadButton)`
  ${buttons.button};
  ${buttons.default};
  ${buttons.gray};

  input {
    height: 0.1px;
    width: 0.1px;
    margin: 0;
    padding: 0;
    opacity: 0;
    overflow: hidden;
    position: absolute;
  }
`;

export interface QrScanDialogProps {
  onConfirm: (decodedText: string) => void;
  onCancel: () => void;
  t: TranslateFunction;
  /** Test seam: defaults to `navigator.mediaDevices`. */
  mediaDevices?: CaptureMediaDevices | undefined;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => track.stop());
}

/**
 * QR-code scan dialog (DCMS-2229), opened from the media library toolbar
 * alongside the camera/screen capture dialogs (DCMS-2011). Unlike those,
 * the outcome isn't a `File` to upload — it's decoded text (typically a
 * URL) that's handed to `insertMedia` the same way "Insert from URL" is,
 * so scanning a code is a shortcut for typing a URL by hand.
 *
 * Two decode sources, both going through `qrScan.ts`'s pure decode helpers
 * so the DSP/decoding step itself stays out of this DOM-heavy component:
 *  - a live camera stream, polled on an interval and decoded frame-by-frame
 *  - a user-uploaded image, decoded once on selection
 */
export default function QrScanDialog({ onConfirm, onCancel, t, mediaDevices }: QrScanDialogProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDecodingFrameRef = React.useRef(false);
  const resolvedRef = React.useRef(false);
  const [isReady, setIsReady] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | undefined>(undefined);
  const [uploadError, setUploadError] = React.useState<string | undefined>(undefined);
  const [isDecodingUpload, setIsDecodingUpload] = React.useState(false);

  const devices = mediaDevices ?? (typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined);

  function confirmOnce(decodedText: string) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    stopStream(streamRef.current);
    streamRef.current = null;
    onConfirm(decodedText);
  }

  React.useEffect(() => {
    let cancelled = false;

    async function start() {
      const capture = devices?.getUserMedia;
      if (!capture) {
        setCameraError(t('mediaLibrary.qrScanDialog.cameraUnsupported'));
        return;
      }

      let stream: MediaStream;
      try {
        stream = await capture.call(devices, { video: { facingMode: 'environment' } });
      } catch {
        if (!cancelled) {
          setCameraError(t('mediaLibrary.qrScanDialog.permissionError'));
        }
        return;
      }

      if (cancelled) {
        stopStream(stream);
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Autoplay can reject in some environments; the scan loop below
          // still runs once frames start arriving, so this is non-fatal.
        }
      }
      if (!cancelled) {
        setIsReady(true);
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [devices, t]);

  React.useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      void scanFrame();
    }, SCAN_INTERVAL_MS);

    async function scanFrame() {
      if (isDecodingFrameRef.current || resolvedRef.current) return;
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;

      isDecodingFrameRef.current = true;
      try {
        scanCanvasRef.current ??= document.createElement('canvas');
        const canvas = scanCanvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = await decodeQrFromImageData(imageData);
        if (decoded) {
          confirmOnce(decoded);
        }
      } finally {
        isDecodingFrameRef.current = false;
      }
    }

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confirmOnce is stable across the dialog's lifetime
  }, [isReady]);

  function handleCancel() {
    stopStream(streamRef.current);
    streamRef.current = null;
    onCancel();
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadError(undefined);
    setIsDecodingUpload(true);
    try {
      const decoded = await decodeQrFromImageSource(file);
      if (decoded) {
        confirmOnce(decoded);
      } else {
        setUploadError(t('mediaLibrary.qrScanDialog.decodeError'));
      }
    } catch {
      setUploadError(t('mediaLibrary.qrScanDialog.decodeError'));
    } finally {
      setIsDecodingUpload(false);
    }
  }

  return (
    <Modal isOpen onClose={handleCancel} ariaLabel={t('mediaLibrary.qrScanDialog.title')}>
      <DialogBody>
        <Title>{t('mediaLibrary.qrScanDialog.title')}</Title>
        {cameraError
          ? <ErrorMessage>{cameraError}</ErrorMessage>
          : (
            <Stage>
              <StageVideo ref={videoRef} muted playsInline data-testid="qr-scan-video" />
            </Stage>
          )}
        <Hint>{t('mediaLibrary.qrScanDialog.hint')}</Hint>
        {uploadError ? <ErrorMessage>{uploadError}</ErrorMessage> : null}
        <ButtonRow>
          <CancelButton type="button" onClick={handleCancel}>
            {t('mediaLibrary.qrScanDialog.cancel')}
          </CancelButton>
          <UploadButton
            label={
              isDecodingUpload
                ? t('mediaLibrary.qrScanDialog.uploadDecoding')
                : t('mediaLibrary.qrScanDialog.uploadLabel')
            }
            imagesOnly
            onChange={event => void handleUpload(event)}
            disabled={isDecodingUpload}
          />
        </ButtonRow>
      </DialogBody>
    </Modal>
  );
}
