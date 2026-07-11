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
  CmsFieldRichtext,
  CmsFieldMeta,
  CmsFieldNumber,
  CmsFieldObject,
  CmsFieldRelation,
  CmsFieldSelect,
  CmsFieldString,
  CmsFieldText,
} from './fields';

export type CmsFieldStringOrText = CmsFieldString | CmsFieldText;

export type CmsField = CmsFieldBase &
  (
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
    | CmsFieldMeta
  );
