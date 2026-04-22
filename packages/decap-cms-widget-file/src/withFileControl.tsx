/** @jsxImportSource @emotion/react */
import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import once from 'lodash/once';
import get from 'lodash/get';
import { v4 as uuid } from 'uuid';
import { oneLine } from 'common-tags';
import {
  lengths,
  components,
  buttons,
  borders,
  effects,
  shadows,
  IconButton,
} from 'decap-cms-ui-default';
import { basename } from 'decap-cms-lib-util';
import { arrayMoveImmutable as arrayMove } from 'array-move';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import type { CmsField, CmsFieldBase, CmsFieldFile } from 'decap-cms-lib-util/types/index';

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
  field: CmsField;
  onRemove: () => void;
  onReplace: () => void;
}

function SortableImage(props: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { itemValue, getAsset, field, onRemove, onReplace } = props;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ImageWrapper $sortable>
        <Image src={getAsset(itemValue, field) || ''} />
      </ImageWrapper>
      <SortableImageButtons
        onRemove={onRemove}
        onReplace={onReplace}
      ></SortableImageButtons>
    </div>
  );
}

interface SortableItem {
  id: string;
  value: string;
}

interface SortableMultiImageWrapperProps {
  items: SortableItem[];
  getAsset: (value: string, field?: CmsField) => string;
  field: CmsField;
  onSortEnd: (args: { oldIndex: number; newIndex: number }) => void;
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
  const activationConstraint = { distance: 4 };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint }),
    useSensor(TouchSensor, { activationConstraint }),
  );

  function handleSortEnd({ active, over }: DragEndEvent) {
    onSortEnd({
      oldIndex: items.findIndex((item: SortableItem) => item.id === active.id),
      newIndex: items.findIndex((item: SortableItem) => item.id === over?.id),
    });
  }

  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
      `}
    >
      <DndContext
        modifiers={[restrictToParentElement]}
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragEnd={handleSortEnd}
      >
        <SortableContext items={items}>
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
            ></SortableImage>
          ))}
        </SortableContext>
      </DndContext>
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

function isMultiple(value: FileValue): boolean {
  return Array.isArray(value);
}

function sizeOfValue(value: FileValue): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value ? 1 : 0;
}

function valueListToArray(value: FileValue): string[] | string {
  return value ?? '';
}

function valueListToSortableArray(value: FileValue): SortableItem[] | FileValue {
  if (!isMultiple(value)) {
    return value;
  }

  const arr = valueListToArray(value);
  const valueArray = (Array.isArray(arr) ? arr : [arr]).map((v: string) => ({
    id: uuid(),
    value: v,
  }));

  return valueArray;
}

const warnDeprecatedOptions = once((field: CmsField) =>
  console.warn(oneLine`
  Decap CMS config: ${field.name} field: property "options" has been deprecated for the
  ${field.widget} widget and will be removed in the next major release. Rather than
  \`field.options.media_library\`, apply media library options for this widget under
  \`field.media_library\`.
`),
);

export interface FileControlProps {
  field: CmsFieldFile & CmsFieldBase;
  getAsset: (value: string, field?: CmsField) => string;
  mediaPaths: Map<string, string>;
  onAddAsset: (asset: unknown) => void;
  onChange: (value: unknown) => void;
  onRemoveInsertedMedia: (controlID: string) => void;
  onOpenMediaLibrary: (options: Record<string, unknown>) => void;
  onClearMediaControl: (controlID: string) => void;
  onRemoveMediaControl: (controlID: string) => void;
  classNameWrapper: string;
  value: FileValue;
  t: (key: string) => string;
}

export default function withFileControl({ forImage }: { forImage?: boolean } = {}) {
  return class FileControl extends React.Component<FileControlProps> {
    static propTypes = {
      field: PropTypes.object.isRequired,
      getAsset: PropTypes.func.isRequired,
      mediaPaths: ImmutablePropTypes.map.isRequired,
      onAddAsset: PropTypes.func.isRequired,
      onChange: PropTypes.func.isRequired,
      onRemoveInsertedMedia: PropTypes.func.isRequired,
      onOpenMediaLibrary: PropTypes.func.isRequired,
      onClearMediaControl: PropTypes.func.isRequired,
      onRemoveMediaControl: PropTypes.func.isRequired,
      classNameWrapper: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
        ImmutablePropTypes.listOf(PropTypes.string),
      ]),
      t: PropTypes.func.isRequired,
    };

    static defaultProps = {
      value: '',
    };

    controlID: string;

    constructor(props: FileControlProps) {
      super(props);
      this.controlID = uuid();
    }

    componentDidMount() {
      // Manually validate PropTypes - React 19 breaking change
      PropTypes.checkPropTypes(FileControl.propTypes, this.props, 'prop', 'FileControl');
    }

    shouldComponentUpdate(nextProps: FileControlProps) {
      /**
       * Always update if the value or getAsset changes.
       */
      if (this.props.value !== nextProps.value || this.props.getAsset !== nextProps.getAsset) {
        return true;
      }

      /**
       * If there is a media path for this control in the state object, and that
       * path is different than the value in `nextProps`, update.
       */
      const mediaPath = nextProps.mediaPaths.get(this.controlID);
      if (mediaPath && nextProps.value !== mediaPath) {
        return true;
      }

      return false;
    }

    componentDidUpdate() {
      const { mediaPaths, value, onRemoveInsertedMedia, onChange } = this.props;
      const mediaPath = mediaPaths.get(this.controlID);
      if (mediaPath && mediaPath !== value) {
        onChange(mediaPath);
      } else if (mediaPath && mediaPath === value) {
        onRemoveInsertedMedia(this.controlID);
      }
    }

    componentWillUnmount() {
      this.props.onRemoveMediaControl(this.controlID);
    }

    handleChange = (e: React.MouseEvent) => {
      const { field, onOpenMediaLibrary, value } = this.props;
      e.preventDefault();
      const mediaLibraryFieldOptions = this.getMediaLibraryFieldOptions();

      return onOpenMediaLibrary({
        controlID: this.controlID,
        forImage,
        privateUpload: field.private,
        value: valueListToArray(value),
        allowMultiple: !!mediaLibraryFieldOptions?.allow_multiple,
        config: mediaLibraryFieldOptions?.config,
        field,
      });
    };

    handleUrl = (subject: string) => (e: React.MouseEvent) => {
      e.preventDefault();

      const url = window.prompt(this.props.t(`editor.editorWidgets.${subject}.promptUrl`));

      if (url) {
        return this.props.onChange(url);
      }
    };

    handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      this.props.onClearMediaControl(this.controlID);
      return this.props.onChange('');
    };

    onRemoveOne = (index: number) => () => {
      const value = valueListToArray(this.props.value);
      if (Array.isArray(value)) {
        value.splice(index, 1);
        return this.props.onChange(sizeOfValue(value) > 0 ? [...value] : null);
      }
    };

    onReplaceOne = (index: number) => () => {
      const { field, onOpenMediaLibrary, value } = this.props;
      const mediaLibraryFieldOptions = this.getMediaLibraryFieldOptions();

      return onOpenMediaLibrary({
        controlID: this.controlID,
        forImage,
        privateUpload: field.private,
        value: valueListToArray(value),
        replaceIndex: index,
        allowMultiple: false,
        config: mediaLibraryFieldOptions?.config,
        field,
      });
    };

    getMediaLibraryFieldOptions = () => {
      const { field } = this.props;

      return field.media_library
    };

    allowsMultiple = () => {
      const mediaLibraryFieldOptions = this.getMediaLibraryFieldOptions();
      return (
        mediaLibraryFieldOptions?.config &&
        mediaLibraryFieldOptions.config?.multiple
      );
    };

    onSortEnd = ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      const { value } = this.props;
      const newValue = arrayMove(value as string[], oldIndex, newIndex);
      return this.props.onChange(newValue);
    };

    getValidateValue = () => {
      const { value } = this.props;
      if (value) {
        return isMultiple(value) ? (value as string[]).map((v: string) => basename(v)) : basename(value as string);
      }

      return value;
    };

    renderFileLink = (value: string) => {
      const size = MAX_DISPLAY_LENGTH;
      if (!value || value.length <= size) {
        return value;
      }
      const text = `${value.slice(0, size / 2)}\u2026${value.slice(-(size / 2) + 1)}`;
      return (
        <FileLink href={value} rel="noopener" target="_blank">
          {text}
        </FileLink>
      );
    };

    renderFileLinks = () => {
      const { value } = this.props;

      if (isMultiple(value)) {
        return (
          <FileLinks>
            <FileLinkList>
              {(value as string[]).map((val: string) => (
                <li key={val}>{this.renderFileLink(val)}</li>
              ))}
            </FileLinkList>
          </FileLinks>
        );
      }
      return <FileLinks>{this.renderFileLink(value as string)}</FileLinks>;
    };

    renderImages = () => {
      const { getAsset, value, field } = this.props;
      const items = valueListToSortableArray(value);
      if (isMultiple(value)) {
        return (
          <SortableMultiImageWrapper
            items={items as SortableItem[]}
            onSortEnd={this.onSortEnd}
            onRemoveOne={this.onRemoveOne}
            onReplaceOne={this.onReplaceOne}
            getAsset={getAsset}
            field={field}
          ></SortableMultiImageWrapper>
        );
      }

      const src = getAsset(value as string, field);
      return (
        <ImageWrapper>
          <Image src={src || ''} />
        </ImageWrapper>
      );
    };

    renderSelection = (subject: string) => {
      const { t, field } = this.props;
      const allowsMultiple = this.allowsMultiple();
      return (
        <div>
          {forImage ? this.renderImages() : null}
          <div>
            {forImage ? null : this.renderFileLinks()}
            <FileWidgetButton onClick={this.handleChange}>
              {t(
                `editor.editorWidgets.${subject}.${
                  this.allowsMultiple() ? 'addMore' : 'chooseDifferent'
                }`,
              )}
            </FileWidgetButton>
            {field.choose_url && !this.allowsMultiple() ? (
              <FileWidgetButton onClick={this.handleUrl(subject)}>
                {t(`editor.editorWidgets.${subject}.replaceUrl`)}
              </FileWidgetButton>
            ) : null}
            <FileWidgetButtonRemove onClick={this.handleRemove}>
              {t(`editor.editorWidgets.${subject}.remove${allowsMultiple ? 'All' : ''}`)}
            </FileWidgetButtonRemove>
          </div>
        </div>
      );
    };

    renderNoSelection = (subject: string) => {
      const { t, field } = this.props;
      return (
        <>
          <FileWidgetButton onClick={this.handleChange}>
            {t(`editor.editorWidgets.${subject}.choose${this.allowsMultiple() ? 'Multiple' : ''}`)}
          </FileWidgetButton>
          {field.choose_url ? (
            <FileWidgetButton onClick={this.handleUrl(subject)}>
              {t(`editor.editorWidgets.${subject}.chooseUrl`)}
            </FileWidgetButton>
          ) : null}
        </>
      );
    };

    render() {
      const { value, classNameWrapper } = this.props;
      const subject = forImage ? 'image' : 'file';

      return (
        <div className={classNameWrapper}>
          <span>{value ? this.renderSelection(subject) : this.renderNoSelection(subject)}</span>
        </div>
      );
    }
  };
}
