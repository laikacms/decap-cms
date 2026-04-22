import type { CmsFieldBoolean } from '../cms/fields/boolean';
import type { CmsFieldDateTime } from '../cms/fields/datetime';
import type { CmsFieldFileOrImage } from '../cms/fields/file';
import type { CmsFieldList } from '../cms/fields/list';
import type { CmsFieldMap } from '../cms/fields/map';
import type { CmsFieldNumber } from '../cms/fields/number';
import type { CmsFieldObject } from '../cms/fields/object';
import type { CmsFieldRelation } from '../cms/fields/relation';
import type { CmsFieldSelect } from '../cms/fields/select';
import type { CmsFieldString } from '../cms/fields/string';
import type { CmsFieldText } from '../cms/fields/text';
import type { StaticallyTypedRecord } from '../immutable';

import type { CmsFieldBase } from '../cms/fields';
import type { CmsField } from '../cms/field';

export type FieldBoolean = StaticallyTypedRecord<CmsFieldBoolean>;
export type FieldDateTime = StaticallyTypedRecord<CmsFieldDateTime>;
export type FieldFileOrImage = StaticallyTypedRecord<CmsFieldFileOrImage>;
export type FieldList = StaticallyTypedRecord<CmsFieldList>;
export type FieldMap = StaticallyTypedRecord<CmsFieldMap>;
export type FieldNumber = StaticallyTypedRecord<CmsFieldNumber>;
export type FieldObject = StaticallyTypedRecord<CmsFieldObject>;
export type FieldRelation = StaticallyTypedRecord<CmsFieldRelation>;
export type FieldSelect = StaticallyTypedRecord<CmsFieldSelect>;
export type FieldString = StaticallyTypedRecord<CmsFieldString>;
export type FieldText = StaticallyTypedRecord<CmsFieldText>;

export type FieldBase = StaticallyTypedRecord<CmsFieldBase>;
export type Field = StaticallyTypedRecord<CmsField>;
