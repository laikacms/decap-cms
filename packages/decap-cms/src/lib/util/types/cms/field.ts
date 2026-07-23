import type {
  CmsFieldBase,
  CmsFieldBoolean,
  CmsFieldCode,
  CmsFieldColor,
  CmsFieldDateTime,
  CmsFieldFileOrImage,
  CmsFieldHidden,
  CmsFieldList,
  CmsFieldMap,
  CmsFieldMeta,
  CmsFieldNumber,
  CmsFieldObject,
  CmsFieldRelation,
  CmsFieldRichtext,
  CmsFieldSelect,
  CmsFieldString,
  CmsFieldText,
  CmsFieldUuid,
} from './fields';

export type CmsFieldStringOrText = CmsFieldString | CmsFieldText;

export type CmsField =
  & CmsFieldBase
  & (
    | CmsFieldBoolean
    | CmsFieldCode
    | CmsFieldColor
    | CmsFieldDateTime
    | CmsFieldFileOrImage
    | CmsFieldList
    | CmsFieldMap
    | CmsFieldRichtext
    | CmsFieldNumber
    | CmsFieldObject
    | CmsFieldRelation
    | CmsFieldSelect
    | CmsFieldHidden
    | CmsFieldStringOrText
    | CmsFieldUuid
    | CmsFieldMeta
  );
