import styled from '@emotion/styled';
import React from 'react';

import { Modal } from '@/core/components/UI';
import { canvasToBlob, createCanvas } from '@/lib/util/index';
import { buttons, colors } from '@/ui/default/index';

import type { TranslateFunction } from '@/ui/default/index';

const MAX_DISPLAY_WIDTH = 600;
const MAX_DISPLAY_HEIGHT = 420;

const DialogBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const Title = styled.h2`
  margin: 0;
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
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
`;

const CancelButton = styled.button`
  ${buttons.button};
  ${buttons.default};
  ${buttons.gray};
`;

const ConfirmButton = styled.button`
  ${buttons.button};
  ${buttons.default};
  ${buttons.teal};
`;

export type CaptureMode = 'camera' | 'screen';

/**
 * The subset of `MediaDevices` this dialog needs, narrowed so tests can
 * supply a fake without implementing the full browser interface.
 */
export type CaptureMediaDevices = {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>,
  getDisplayMedia?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>,
};

export interface CaptureDialogProps {
  mode: CaptureMode;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  t: TranslateFunction;
  /** Test seam: defaults to `navigator.mediaDevices`. */
  mediaDevices?: CaptureMediaDevices | undefined;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => track.stop());
}

/**
 * Camera/screen capture-before-upload step (DCMS-2011): opened from the
 * media library toolbar as an alternative to picking a file from disk.
 * Streams a live preview via `getUserMedia`/`getDisplayMedia`, and on
 * "Capture" snapshots the current video frame to a canvas and produces a
 * PNG `File`, which the caller runs through the same persist (and, for
 * images, crop-dialog) pipeline as any other upload.
 */
export default function CaptureDialog({ mode, onConfirm, onCancel, t, mediaDevices }: CaptureDialogProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const devices = mediaDevices ?? (typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined);

  React.useEffect(() => {
    let cancelled = false;

    async function start() {
      const capture = mode === 'camera' ? devices?.getUserMedia : devices?.getDisplayMedia;
      if (!capture) {
        setError(t('mediaLibrary.captureDialog.unsupported'));
        return;
      }

      let stream: MediaStream;
      try {
        stream = mode === 'camera'
          ? await capture.call(devices, { video: true })
          : await capture.call(devices, { video: true });
      } catch {
        if (!cancelled) {
          setError(t('mediaLibrary.captureDialog.permissionError'));
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
          // Autoplay can reject in some environments; the video still
          // renders once the user interacts with the page, so this is
          // non-fatal.
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
  }, [mode, devices, t]);

  function handleCancel() {
    stopStream(streamRef.current);
    streamRef.current = null;
    onCancel();
  }

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    setIsCapturing(true);
    try {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError(t('mediaLibrary.captureDialog.captureError'));
        return;
      }
      ctx.drawImage(video, 0, 0, width, height, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, 'image/png', undefined);
      const fileName = `${mode}-capture-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      stopStream(streamRef.current);
      streamRef.current = null;
      onConfirm(file);
    } catch {
      setError(t('mediaLibrary.captureDialog.captureError'));
    } finally {
      setIsCapturing(false);
    }
  }

  const titleKey = mode === 'camera'
    ? 'mediaLibrary.captureDialog.cameraTitle'
    : 'mediaLibrary.captureDialog.screenTitle';

  return (
    <Modal isOpen onClose={handleCancel} ariaLabel={t(titleKey)}>
      <DialogBody>
        <Title>{t(titleKey)}</Title>
        {error
          ? <ErrorMessage>{error}</ErrorMessage>
          : (
            <Stage>
              <StageVideo ref={videoRef} muted playsInline data-testid="capture-video" />
            </Stage>
          )}
        <ButtonRow>
          <CancelButton type="button" onClick={handleCancel}>
            {t('mediaLibrary.captureDialog.cancel')}
          </CancelButton>
          <ConfirmButton
            type="button"
            onClick={() => void handleCapture()}
            disabled={!isReady || isCapturing || !!error}
          >
            {t('mediaLibrary.captureDialog.capture')}
          </ConfirmButton>
        </ButtonRow>
      </DialogBody>
    </Modal>
  );
}
