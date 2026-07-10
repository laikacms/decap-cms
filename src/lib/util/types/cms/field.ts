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
  CmsFieldMarkdown,
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
    | CmsFieldMarkdown
    | CmsFieldNumber
    | CmsFieldObject
    | CmsFieldRelation
    | CmsFieldSelect
    | CmsFieldHidden
    | CmsFieldStringOrText
    | CmsFieldMeta
  );
