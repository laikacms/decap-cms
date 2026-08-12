import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React, { useEffect, useState } from 'react';

import { basename } from '@/lib/util/index';
import { randomUUID } from '@/lib/util/index';
import { promptDialog, showAlert } from '@/ui';
import {
  borders,
  buttons,
  colors,
  components,
  effects,
  IconButton,
  lengths,
  shadows,
  SortableArea,
  SortableHandle,
  SortableItem as UISortableItem,
} from '@/ui/default/index';

import type { CmsField, CmsFieldBase, CmsFieldFileOrImage } from '@/lib/util/index';

/**
 * Field config for the `file` widget, and (via `withFileControl({ forImage:
 * true })`) the `image` widget that shares this control.
 */
export type FileControlField = CmsFieldFileOrImage & CmsFieldBase;

const MAX_DISPLAY_LENGTH = 50;

interface ImageWrapperProps {
  $sortable?: boolean;
}

const ImageWrapper = styled.div<ImageWrapperProps>`
  flex-basis: 155px;
  width: 155px;
  height: 100px;
  margin-right: 20px;
  margin-bottom: 20px;
  border: ${borders.textField};
  border-radius: ${lengths.borderRadius};
  overflow: hidden;
  ${effects.checkerboard};
  ${shadows.inset};
  cursor: ${(props: ImageWrapperProps) => (props.$sortable ? 'pointer' : 'auto')};
`;

const SortableImageButtonsWrapper = styled.div`
  display: flex;
  justify-content: center;
  column-gap: 10px;
  margin-right: 20px;
  margin-top: -10px;
  margin-bottom: 10px;
`;

const StyledImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

function Image(props: ImageProps) {
  return <StyledImage role="presentation" {...props} />;
}

interface ImageAssetProps {
  value: string;
  field?: FileControlField;
  getAsset: (value: string, field?: CmsField) => string;
}

// DCMS-1036 / decaporg#7416: calling getAsset() during render dispatches
// redux actions synchronously, which triggers React's "Cannot update a
// component while rendering a different component" warning. Resolve the
// asset in an effect instead.
function ImageAsset({ value, field, getAsset }: ImageAssetProps) {
  const [asset, setAsset] = useState<string | undefined>(undefined);

  useEffect(() => {
    setAsset(value ? getAsset(value, field) : undefined);
  }, [value, field, getAsset]);

  return <Image src={asset || ''} />;
}

interface SortableImageButtonsProps {
  onRemove: () => void;
  onReplace: () => void;
}

function SortableImageButtons({ onRemove, onReplace }: SortableImageButtonsProps) {
  return (
    <SortableImageButtonsWrapper>
      <IconButton size="small" type="media" onClick={onReplace}></IconButton>
      <IconButton size="small" type="close" onClick={onRemove}></IconButton>
    </SortableImageButtonsWrapper>
  );
}

interface SortableImageProps {
  id: string;
  index: number;
  itemValue: string;
  getAsset: (value: string, field?: CmsField) => string;
  field: FileControlField;
  onRemove: () => void;
  onReplace: () => void;
}

function SortableImage(props: SortableImageProps) {
  const { index, itemValue, getAsset, field, onRemove, onReplace } = props;

  return (
    <UISortableItem index={index} withHandle>
      {(ref, { isDragging, isOver }) => (
        <div
          ref={ref}
          style={{
            opacity: isDragging ? 0.5 : undefined,
            outline: isOver ? `2px solid ${colors.active}` : undefined,
          }}
        >
          <SortableHandle>
            <ImageWrapper $sortable>
              <ImageAsset value={itemValue} field={field} getAsset={getAsset} />
            </ImageWrapper>
          </SortableHandle>
          <SortableImageButtons onRemove={onRemove} onReplace={onReplace}></SortableImageButtons>
        </div>
      )}
    </UISortableItem>
  );
}

interface SortableItem {
  id: string;
  value: string;
}

interface SortableMultiImageWrapperProps {
  items: SortableItem[];
  getAsset: (value: string, field?: CmsField) => string;
  field: FileControlField;
  onSortEnd: (args: { oldIndex: number, newIndex: number }) => void;
  onRemoveOne: (index: number) => () => void;
  onReplaceOne: (index: number) => () => void;
}

function SortableMultiImageWrapper({
  items,
  getAsset,
  field,
  onSortEnd,
  onRemoveOne,
  onReplaceOne,
}: SortableMultiImageWrapperProps) {
  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
      `}
    >
      <SortableArea onSortEnd={onSortEnd}>
        {items.map((item: SortableItem, index: number) => (
          <SortableImage
            key={item.id}
            id={item.id}
            index={index}
            itemValue={item.value}
            getAsset={getAsset}
            field={field}
            onRemove={onRemoveOne(index)}
            onReplace={onReplaceOne(index)}
          >
          </SortableImage>
        ))}
      </SortableArea>
    </div>
  );
}

const FileLink = styled.a`
  margin-bottom: 20px;
  font-weight: normal;
  color: inherit;

  &:hover,
  &:active,
  &:focus {
    text-decoration: underline;
  }
`;

const FileLinks = styled.div`
  margin-bottom: 12px;
`;

const FileLinkList = styled.ul`
  list-style-type: none;
`;

const FileWidgetButton = styled.button`
  ${buttons.button};
  ${components.badge};
  margin-bottom: 12px;
`;

const FileWidgetButtonRemove = styled.button`
  ${buttons.button};
  ${components.badgeDanger};
`;

type FileValue = string | string[];

// DCMS-1292: exported (like isSafeUrl below) so these pure helpers driving
// the sortable multi-image UI can be unit tested directly instead of only
// through full component + drag-and-drop simulation.
export function arrayMove<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const newArray = [...array];
  const [item] = newArray.splice(fromIndex, 1);
  newArray.splice(toIndex, 0, item);
  return newArray;
}

function isMultiple(value: FileValue): boolean {
  return Array.isArray(value);
}

const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:']);

// DCMS-577 / DCMS-668: 'Insert from URL' must not persist javascript:/data:/vbscript:
// URLs, since downstream (non-React) renderers of the saved entry have no equivalent
// runtime guard. Keep this allowlist in sync with the pre-v4.beta implementation this
// widget was rewritten from (packages/decap-cms-widget-file/src/withFileControl.js).
export function isSafeUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  // Protocol-relative URLs (`//example.com/x`) inherit the page's scheme, which is
  // always http(s) in a browser context, so they're safe to allow.
  if (/^\/\//.test(url)) {
    return true;
  }

  let parsed;
  try {
    parsed = new URL(url, window.location.href);
  } catch {
    return false;
  }

  return ALLOWED_URL_SCHEMES.has(parsed.protocol);
}

// DCMS-1292: exported for direct unit testing, see arrayMove above.
export function sizeOfValue(value: FileValue): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value ? 1 : 0;
}

// DCMS-1292: exported for direct unit testing, see arrayMove above.
export function valueListToArray(value: FileValue): string[] | string {
  return value ?? '';
}

function valueListToSortableArray(value: FileValue): SortableItem[] | FileValue {
  if (!isMultiple(value)) {
    return value;
  }

  const arr = valueListToArray(value);
  const valueArray = (Array.isArray(arr) ? arr : [arr]).map((v: string) => ({
    id: randomUUID(),
    value: v,
  }));

  return valueArray;
}

export interface FileControlProps {
  field: FileControlField;
  getAsset: (value: string, field?: CmsField) => string;
  mediaPaths: Record<string, string>;
  onAddAsset: (asset: unknown) => void;
  onChange: (value: unknown) => void;
  onRemoveInsertedMedia: (controlID: string) => void;
  onOpenMediaLibrary: (options: Record<string, unknown>) => void;
  onClearMediaControl: (controlID: string) => void;
  onRemoveMediaControl: (controlID: string) => void;
  classNameWrapper: string;
  value: FileValue;
  t: (key: string) => string;
  forID?: string;
  hasErrors?: boolean;
  errorListId?: string;
  hintId?: string;
}

export interface FileControlHandle {
  getValidateValue(): FileValue;
}

export default function withFileControl({ forImage }: { forImage?: boolean } = {}) {
  return React.forwardRef<FileControlHandle, FileControlProps>(function FileControl(props, ref) {
    const {
      field,
      getAsset,
      mediaPaths,
      onChange,
      onRemoveInsertedMedia,
      onOpenMediaLibrary,
      onClearMediaControl,
      onRemoveMediaControl,
      classNameWrapper,
      value = '',
      t,
      forID,
      hasErrors,
      errorListId,
      hintId,
    } = props;

    // `role="button"` (the implicit role of a native <button>) does not
    // permit `aria-required` per ARIA 1.3 (see DCMS-1389, a sibling
    // regression of DCMS-1086's aria-required rollout). Required-ness is
    // instead conveyed by appending a "required" cue to the button's
    // accessible name via `aria-label`, applied at each call site so it can
    // be combined with that button's own visible label text.
    const isRequired = field.required !== false;
    const requiredCue = isRequired ? ` (${t('editor.editorControl.field.required')})` : '';

    const chooseButtonAriaProps = {
      id: forID,
      'aria-invalid': hasErrors || undefined,
      'aria-errormessage': hasErrors ? errorListId : undefined,
      'aria-describedby': hintId,
    };

    const controlIDRef = React.useRef<string>('');
    if (!controlIDRef.current) {
      controlIDRef.current = randomUUID();
    }
    const controlID = controlIDRef.current;

    // Stable handle: read latest value via ref so callers that captured the
    // handle once keep seeing the current value.
    const valueRef = React.useRef(value);
    valueRef.current = value;
    React.useImperativeHandle(
      ref,
      () => ({
        getValidateValue() {
          const v = valueRef.current;
          if (v) {
            return isMultiple(v)
              ? (v as string[]).map((s: string) => basename(s))
              : basename(v as string);
          }
          return v;
        },
      }),
      [],
    );

    // Mirror componentDidUpdate: react to mediaPath changes for this control.
    React.useEffect(() => {
      const mediaPath = mediaPaths[controlID];
      if (mediaPath && mediaPath !== value) {
        onChange(mediaPath);
      } else if (mediaPath && mediaPath === value) {
        onRemoveInsertedMedia(controlID);
      }
    });

    // Mirror componentWillUnmount: release the media control slot.
    const onRemoveMediaControlRef = React.useRef(onRemoveMediaControl);
    onRemoveMediaControlRef.current = onRemoveMediaControl;
    React.useEffect(() => {
      return () => {
        onRemoveMediaControlRef.current(controlID);
      };
    }, [controlID]);

    function getMediaLibraryFieldOptions() {
      return field.media_library;
    }

    function allowsMultiple() {
      const opts = getMediaLibraryFieldOptions();
      return opts?.config && opts.config?.multiple;
    }

    function handleChange(e: React.MouseEvent) {
      e.preventDefault();
      const opts = getMediaLibraryFieldOptions();
      return onOpenMediaLibrary({
        controlID,
        forImage,
        privateUpload: field.private,
        value: valueListToArray(value),
        allowMultiple: opts?.allow_multiple,
        config: opts?.config,
        field,
      });
    }

    function handleUrl(subject: string) {
      return (e: React.MouseEvent) => {
        e.preventDefault();
        void (async () => {
          const url = await promptDialog(t(`editor.editorWidgets.${subject}.promptUrl`));
          if (!url) {
            return;
          }

          if (!isSafeUrl(url)) {
            await showAlert(t(`editor.editorWidgets.${subject}.invalidUrl`), {
              title: t(`editor.editorWidgets.${subject}.invalidUrlTitle`),
            });
            return;
          }

          onChange(url);
        })();
      };
    }

    function handleRemove(e: React.MouseEvent) {
      e.preventDefault();
      onClearMediaControl(controlID);
      return onChange('');
    }

    function onRemoveOne(index: number) {
      return () => {
        const v = valueListToArray(value);
        if (Array.isArray(v)) {
          v.splice(index, 1);
          return onChange(sizeOfValue(v) > 0 ? [...v] : null);
        }
      };
    }

    function onReplaceOne(index: number) {
      return () => {
        const opts = getMediaLibraryFieldOptions();
        return onOpenMediaLibrary({
          controlID,
          forImage,
          privateUpload: field.private,
          value: valueListToArray(value),
          replaceIndex: index,
          allowMultiple: false,
          config: opts?.config,
          field,
        });
      };
    }

    function onSortEnd({ oldIndex, newIndex }: { oldIndex: number, newIndex: number }) {
      const newValue = arrayMove(value as string[], oldIndex, newIndex);
      return onChange(newValue);
    }

    function renderFileLink(v: string) {
      const size = MAX_DISPLAY_LENGTH;
      if (!v || v.length <= size) {
        return v;
      }
      const text = `${v.slice(0, size / 2)}…${v.slice(-(size / 2) + 1)}`;
      return (
        <FileLink href={v} rel="noopener noreferrer" target="_blank">
          {text}
        </FileLink>
      );
    }

    function renderFileLinks() {
      if (isMultiple(value)) {
        return (
          <FileLinks>
            <FileLinkList>
              {(value as string[]).map((val: string) => <li key={val}>{renderFileLink(val)}</li>)}
            </FileLinkList>
          </FileLinks>
        );
      }
      return <FileLinks>{renderFileLink(value as string)}</FileLinks>;
    }

    function renderImages() {
      const items = valueListToSortableArray(value);
      if (isMultiple(value)) {
        return (
          <SortableMultiImageWrapper
            items={items as SortableItem[]}
            onSortEnd={onSortEnd}
            onRemoveOne={onRemoveOne}
            onReplaceOne={onReplaceOne}
            getAsset={getAsset}
            field={field}
          />
        );
      }

      return (
        <ImageWrapper>
          <ImageAsset value={value as string} field={field} getAsset={getAsset} />
        </ImageWrapper>
      );
    }

    function renderSelection(subject: string) {
      const multi = allowsMultiple();
      const chooseUrl = field.choose_url !== false;
      const chooseLabel = t(
        `editor.editorWidgets.${subject}.${multi ? 'addMore' : 'chooseDifferent'}`,
      );
      return (
        <div>
          {forImage ? renderImages() : null}
          <div>
            {forImage ? null : renderFileLinks()}
            <FileWidgetButton
              onClick={handleChange}
              {...chooseButtonAriaProps}
              aria-label={isRequired ? `${chooseLabel}${requiredCue}` : undefined}
            >
              {chooseLabel}
            </FileWidgetButton>
            {chooseUrl && !multi
              ? (
                <FileWidgetButton onClick={handleUrl(subject)}>
                  {t(`editor.editorWidgets.${subject}.replaceUrl`)}
                </FileWidgetButton>
              )
              : null}
            <FileWidgetButtonRemove onClick={handleRemove}>
              {t(`editor.editorWidgets.${subject}.remove${multi ? 'All' : ''}`)}
            </FileWidgetButtonRemove>
          </div>
        </div>
      );
    }

    function renderNoSelection(subject: string) {
      const chooseUrl = field.choose_url !== false;
      const chooseLabel = t(
        `editor.editorWidgets.${subject}.choose${allowsMultiple() ? 'Multiple' : ''}`,
      );
      return (
        <>
          <FileWidgetButton
            onClick={handleChange}
            {...chooseButtonAriaProps}
            aria-label={isRequired ? `${chooseLabel}${requiredCue}` : undefined}
          >
            {chooseLabel}
          </FileWidgetButton>
          {chooseUrl
            ? (
              <FileWidgetButton onClick={handleUrl(subject)}>
                {t(`editor.editorWidgets.${subject}.chooseUrl`)}
              </FileWidgetButton>
            )
            : null}
        </>
      );
    }

    const subject = forImage ? 'image' : 'file';

    return (
      <div className={classNameWrapper}>
        <span>{value ? renderSelection(subject) : renderNoSelection(subject)}</span>
      </div>
    );
  });
}
