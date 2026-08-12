import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { Modal } from '@/core/components/UI';
import {
  clampCropRect,
  constrainCropRectToAspectRatio,
  cropImageFile,
  initialCropRect,
} from '@/lib/util/index';
import { buttons, colors } from '@/ui/default/index';

import type { CropRect } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const MAX_DISPLAY_WIDTH = 600;
const MAX_DISPLAY_HEIGHT = 420;
const HANDLE_SIZE = 14;

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
  position: relative;
  line-height: 0;
  background-color: #333;
`;

const StageImage = styled.img`
  display: block;
`;

const SelectionOverlay = styled.div`
  position: absolute;
  border: 2px solid ${colors.active};
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  cursor: move;
  box-sizing: border-box;
`;

const ResizeHandle = styled.div`
  position: absolute;
  right: -${HANDLE_SIZE / 2}px;
  bottom: -${HANDLE_SIZE / 2}px;
  width: ${HANDLE_SIZE}px;
  height: ${HANDLE_SIZE}px;
  background-color: ${colors.active};
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: nwse-resize;
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

type DragMode = { kind: 'move', startX: number, startY: number, startRect: CropRect } | {
  kind: 'resize',
  startX: number,
  startY: number,
  startRect: CropRect,
};

export interface ImageCropDialogProps {
  file: File;
  aspectRatio?: number | undefined;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  t: TranslateFunction;
}

/**
 * Interactive crop/resize-before-upload step (DCMS-2011): shown in front of
 * `MediaLibrary.handlePersist` for image uploads when `media_library.config.crop`
 * is enabled, letting the user pick the region to keep before the file is
 * handed to `persistMedia`. Deliberately separate from the automatic,
 * non-interactive `optimizeImageFile` pipeline (DCMS-1397) — this one always
 * needs a human in the loop to choose *where* to crop.
 */
export default function ImageCropDialog({ file, aspectRatio, onConfirm, onCancel, t }: ImageCropDialogProps) {
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined);
  const [naturalSize, setNaturalSize] = React.useState<{ width: number, height: number } | undefined>(undefined);
  const [cropRect, setCropRect] = React.useState<CropRect | undefined>(undefined);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const dragRef = React.useRef<DragMode | null>(null);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  React.useEffect(() => {
    let cancelled = false;
    createImageBitmap(file)
      .then(bitmap => {
        if (cancelled) return;
        setNaturalSize({ width: bitmap.width, height: bitmap.height });
        setCropRect(initialCropRect(bitmap.width, bitmap.height, aspectRatio));
        bitmap.close?.();
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file, aspectRatio]);

  const scale = naturalSize
    ? Math.min(1, MAX_DISPLAY_WIDTH / naturalSize.width, MAX_DISPLAY_HEIGHT / naturalSize.height)
    : 1;
  const displayWidth = naturalSize ? Math.round(naturalSize.width * scale) : 0;
  const displayHeight = naturalSize ? Math.round(naturalSize.height * scale) : 0;

  function toDisplayRect(rect: CropRect) {
    return {
      left: rect.x * scale,
      top: rect.y * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    };
  }

  function updateRect(next: CropRect) {
    if (!naturalSize) return;
    let clamped = clampCropRect(next, naturalSize.width, naturalSize.height);
    if (aspectRatio) {
      clamped = constrainCropRectToAspectRatio(clamped, aspectRatio, naturalSize.width, naturalSize.height);
    }
    setCropRect(clamped);
  }

  function handleSelectionPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropRect) return;
    event.preventDefault();
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    dragRef.current = { kind: 'move', startX: event.clientX, startY: event.clientY, startRect: cropRect };
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropRect) return;
    event.preventDefault();
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    dragRef.current = { kind: 'resize', startX: event.clientX, startY: event.clientY, startRect: cropRect };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || scale === 0) return;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;

    if (drag.kind === 'move') {
      updateRect({ ...drag.startRect, x: drag.startRect.x + dx, y: drag.startRect.y + dy });
    } else {
      updateRect({
        ...drag.startRect,
        width: drag.startRect.width + dx,
        height: drag.startRect.height + dy,
      });
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  async function handleConfirm() {
    if (!cropRect) return;
    setIsProcessing(true);
    try {
      const cropped = await cropImageFile(file, cropRect);
      onConfirm(cropped);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Modal isOpen onClose={onCancel} ariaLabel={t('mediaLibrary.cropDialog.title')}>
      <DialogBody>
        <Title>{t('mediaLibrary.cropDialog.title')}</Title>
        {loadError
          ? <p>{t('mediaLibrary.cropDialog.loadError')}</p>
          : (
            <Stage
              style={{ width: displayWidth || undefined, height: displayHeight || undefined }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {imageUrl
                ? (
                  <StageImage
                    src={imageUrl}
                    alt={file.name}
                    width={displayWidth || undefined}
                    height={displayHeight || undefined}
                  />
                )
                : null}
              {cropRect
                ? (
                  <SelectionOverlay
                    css={css`
                      left: ${toDisplayRect(cropRect).left}px;
                      top: ${toDisplayRect(cropRect).top}px;
                      width: ${toDisplayRect(cropRect).width}px;
                      height: ${toDisplayRect(cropRect).height}px;
                    `}
                    onPointerDown={handleSelectionPointerDown}
                    data-testid="crop-selection"
                  >
                    <ResizeHandle onPointerDown={handleResizePointerDown} data-testid="crop-resize-handle" />
                  </SelectionOverlay>
                )
                : null}
            </Stage>
          )}
        <ButtonRow>
          <CancelButton type="button" onClick={onCancel} disabled={isProcessing}>
            {t('mediaLibrary.cropDialog.cancel')}
          </CancelButton>
          <ConfirmButton
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isProcessing || !cropRect || loadError}
          >
            {t('mediaLibrary.cropDialog.confirm')}
          </ConfirmButton>
        </ButtonRow>
      </DialogBody>
    </Modal>
  );
}
