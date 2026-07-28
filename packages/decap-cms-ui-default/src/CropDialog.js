import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';

import { colorsRaw } from './styles';
import { DialogFrame, Title, Message, Footer, DialogButton, useDialogIds } from './AlertDialog';

/**
 * Canvas-based crop-before-upload step for the image widget (DCMS-1424).
 *
 * `cropImage(file)` queues a request on a module-level store, mirroring the
 * `showAlert`/`confirmDialog`/`promptDialog` pattern in `AlertDialog.js`, and
 * resolves once a mounted `CropDialogHost` renders it and the user responds:
 * - drag a rectangle over the image and confirm -> resolves with a new
 *   `File` cropped to that rectangle (real canvas crop, not a stub)
 * - "Use original" -> resolves with the original `file` unchanged
 * - "Cancel" / Escape / backdrop click -> resolves with `null`, signaling the
 *   caller to abort the upload
 *
 * If no host is mounted (e.g. a unit test exercising the upload pipeline
 * directly), it resolves with the original `file` so callers keep working
 * unmodified, same fallback shape as the other dialogs in this module.
 */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const CropStage = styled.div`
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  cursor: crosshair;
  user-select: none;
`;

const CropImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 60vh;
  width: auto;
  height: auto;
`;

const SelectionBox = styled.div`
  position: absolute;
  border: 2px dashed ${colorsRaw.white};
  outline: 1px solid rgba(0, 0, 0, 0.6);
  background-color: rgba(255, 255, 255, 0.15);
  pointer-events: none;
`;

let pendingCrops = [];
let nextCropId = 1;
const cropListeners = new Set();

function subscribeToCrops(listener) {
  cropListeners.add(listener);
  return () => cropListeners.delete(listener);
}
function getPendingCrops() {
  return pendingCrops;
}
function emitCropsChanged() {
  cropListeners.forEach(listener => listener());
}

export function cropImage(file, options = {}) {
  if (cropListeners.size === 0) {
    return Promise.resolve(file);
  }
  return new Promise(resolve => {
    pendingCrops = [...pendingCrops, { id: nextCropId++, file, resolve, ...options }];
    emitCropsChanged();
  });
}

function hasSelection(selection) {
  return Boolean(selection && selection.w >= 2 && selection.h >= 2);
}

function CropDialogEntry({ entry, titleId, descriptionId, onSettle }) {
  const [imageUrl, setImageUrl] = React.useState(null);
  const [selection, setSelection] = React.useState(null);
  const dragStart = React.useRef(null);
  const stageRef = React.useRef(null);
  const imgRef = React.useRef(null);

  React.useEffect(() => {
    const url = URL.createObjectURL(entry.file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [entry.file]);

  function getStagePoint(event) {
    const rect = stageRef.current.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
    };
  }

  function handleMouseDown(event) {
    const point = getStagePoint(event);
    dragStart.current = point;
    setSelection({ x: point.x, y: point.y, w: 0, h: 0 });
  }

  function handleMouseMove(event) {
    if (!dragStart.current) {
      return;
    }
    const point = getStagePoint(event);
    setSelection({
      x: Math.min(dragStart.current.x, point.x),
      y: Math.min(dragStart.current.y, point.y),
      w: Math.abs(point.x - dragStart.current.x),
      h: Math.abs(point.y - dragStart.current.y),
    });
  }

  function handleMouseUp() {
    dragStart.current = null;
  }

  function handleUseOriginal() {
    onSettle(entry.file);
  }

  function handleCancel() {
    onSettle(null);
  }

  async function handleConfirmCrop() {
    if (!hasSelection(selection) || !imgRef.current) {
      handleUseOriginal();
      return;
    }

    const img = imgRef.current;
    const displayRect = img.getBoundingClientRect();
    const stageRect = stageRef.current.getBoundingClientRect();
    const offsetX = displayRect.left - stageRect.left;
    const offsetY = displayRect.top - stageRect.top;
    const scaleX = img.naturalWidth / displayRect.width;
    const scaleY = img.naturalHeight / displayRect.height;

    const sx = clamp((selection.x - offsetX) * scaleX, 0, img.naturalWidth);
    const sy = clamp((selection.y - offsetY) * scaleY, 0, img.naturalHeight);
    const sw = clamp(selection.w * scaleX, 1, img.naturalWidth - sx);
    const sh = clamp(selection.h * scaleY, 1, img.naturalHeight - sy);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const outputType = entry.file.type || 'image/png';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, outputType));

    if (!blob) {
      handleUseOriginal();
      return;
    }

    const croppedFile = new File([blob], entry.file.name, {
      type: blob.type || outputType,
      lastModified: Date.now(),
    });
    onSettle(croppedFile);
  }

  const canCrop = hasSelection(selection);

  return (
    <DialogFrame titleId={titleId} descriptionId={descriptionId} onDismiss={handleCancel}>
      <Title id={titleId}>{entry.title || 'Crop image'}</Title>
      <Message id={descriptionId}>
        {entry.message || 'Drag over the image to select a crop area, or use the original image.'}
      </Message>
      <CropStage
        ref={stageRef}
        data-testid="crop-stage"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {imageUrl && (
          <CropImage
            ref={imgRef}
            data-testid="crop-image"
            src={imageUrl}
            alt=""
            draggable={false}
          />
        )}
        {canCrop && (
          <SelectionBox
            data-testid="crop-selection"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h,
            }}
          />
        )}
      </CropStage>
      <Footer>
        <DialogButton type="button" onClick={handleCancel}>
          Cancel
        </DialogButton>
        <DialogButton type="button" onClick={handleUseOriginal}>
          Use original
        </DialogButton>
        <DialogButton type="button" variant="primary" onClick={handleConfirmCrop} autoFocus>
          {canCrop ? 'Crop & use selection' : 'Continue'}
        </DialogButton>
      </Footer>
    </DialogFrame>
  );
}

CropDialogEntry.propTypes = {
  entry: PropTypes.shape({
    file: PropTypes.instanceOf(File).isRequired,
    title: PropTypes.string,
    message: PropTypes.string,
  }).isRequired,
  titleId: PropTypes.string.isRequired,
  descriptionId: PropTypes.string.isRequired,
  onSettle: PropTypes.func.isRequired,
};

export function CropDialogHost() {
  const [queue, setQueue] = React.useState(getPendingCrops);
  React.useEffect(() => subscribeToCrops(() => setQueue(getPendingCrops())), []);
  const { titleId, descriptionId } = useDialogIds();
  const current = queue[0];

  if (!current) {
    return null;
  }

  function settle(result) {
    pendingCrops = pendingCrops.filter(pending => pending.id !== current.id);
    emitCropsChanged();
    current.resolve(result);
  }

  return (
    <CropDialogEntry
      key={current.id}
      entry={current}
      titleId={titleId}
      descriptionId={descriptionId}
      onSettle={settle}
    />
  );
}
