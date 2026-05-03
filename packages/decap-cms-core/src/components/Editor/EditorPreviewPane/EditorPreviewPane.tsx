import React from 'react';
import styled from '@emotion/styled';
import type { CmsCollectionState, CmsEntry, CmsEntryField, CmsConfig } from 'decap-cms-lib-util';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;

type State = any;
import Frame, { FrameContextConsumer } from 'react-frame-component';
import { lengths } from 'decap-cms-ui-default';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import { encodeEntry } from '../../../lib/stega';
import {
  resolveWidget,
  getPreviewTemplate,
  getPreviewStyles,
  getRemarkPlugins,
  getEditorComponents,
} from '../../../lib/registry';
import { getAllEntries, tryLoadEntry } from '../../../actions/entries';
import { ErrorBoundary } from '../../UI';
import {
  selectTemplateName,
  selectInferredField,
  selectField,
} from '../../../reducers/collections';
import { boundGetAsset } from '../../../actions/media';
import { selectIsLoadingAsset } from '../../../reducers/medias';
import { INFERABLE_FIELDS } from '../../../constants/fieldInference';
import EditorPreviewContent from './EditorPreviewContent.js';
import PreviewHOC from './PreviewHOC';
import EditorPreview from './EditorPreview';

const PreviewPaneFrame = styled(Frame)`
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
  border-radius: ${lengths.borderRadius};
`;

type InferableFieldValue = (typeof INFERABLE_FIELDS)[keyof typeof INFERABLE_FIELDS];

interface PreviewPaneProps {
  collection: Collection;
  fields: EntryField[];
  entry: EntryMap;
  fieldsMetaData: Record<string, unknown>;
  getAsset: (asset: string) => { url: string; path: string; field?: EntryField };
  onFieldClick?: (fieldName: string) => void;
  config: CmsConfig;
  state: State;
  isLoadingAsset: boolean;
  boundGetAsset: (collection: Collection, entry: EntryMap) => unknown;
}

export class PreviewPane extends React.Component<PreviewPaneProps> {
  getWidget = (
    field: EntryField,
    value: unknown,
    metadata: unknown,
    props: PreviewPaneProps,
    idx: number | string | null = null,
  ) => {
    const { getAsset, entry } = props;
    const widget = resolveWidget(field.widget);
    const key = idx ? field.name + '_' + idx : field.name;
    const valueIsInMap =
      value &&
      !(widget as any)?.allowMapValue &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value);

    /**
     * Use an HOC to provide conditional updates for all previews.
     */
    return !widget?.preview ? null : (
      <PreviewHOC
        previewComponent={widget.preview as unknown as React.ComponentType<Record<string, unknown>>}
        key={key}
        field={field}
        getAsset={getAsset}
        value={valueIsInMap ? (value as Record<string, unknown>)[field.name] : (value as any)}
        {...({
          entry,
          fieldsMetaData: metadata as Record<string, unknown>,
          resolveWidget,
          getRemarkPlugins,
          getEditorComponents,
        } as any)}
      />
    );
  };

  inferredFields: Record<string, InferableFieldValue> = {};

  inferFields() {
    const titleField = selectInferredField(this.props.collection, 'title');
    const shortTitleField = selectInferredField(this.props.collection, 'shortTitle');
    const authorField = selectInferredField(this.props.collection, 'author');

    this.inferredFields = {};
    if (titleField) this.inferredFields[titleField] = INFERABLE_FIELDS.title;
    if (shortTitleField) this.inferredFields[shortTitleField] = INFERABLE_FIELDS.shortTitle;
    if (authorField) this.inferredFields[authorField] = INFERABLE_FIELDS.author;
  }

  /**
   * Returns the widget component for a named field, and makes recursive calls
   * to retrieve components for nested and deeply nested fields, which occur in
   * object and list type fields. Used internally to retrieve widgets, and also
   * exposed for use in custom preview templates.
   */
  widgetFor = (
    name: string,
    fields: EntryField[] = this.props.fields,
    values: unknown = this.props.entry.data,
    fieldsMetaData: Record<string, unknown> = this.props.fieldsMetaData,
  ): React.ReactNode => {
    // We retrieve the field by name so that this function can also be used in
    // custom preview templates, where the field object can't be passed in.
    let field = fields && fields.find(f => f.name === name);
    if (!field) return null;

    let value: any =
      typeof values === 'object' && values !== null && !Array.isArray(values)
        ? (values as Record<string, unknown>)[field.name]
        : undefined;
    if (field.meta) {
      value = (this.props.entry.meta as Record<string, unknown>)?.[field.name];
    }

    const nestedFields = field.fields;
    const singleField = field.field;
    const metadata = fieldsMetaData && (fieldsMetaData[field.name] || {});

    if (nestedFields) {
      field = { ...field, fields: this.getNestedWidgets(nestedFields, value, metadata) as any };
    }

    if (singleField) {
      field = { ...field, field: this.getSingleNested(singleField, value, metadata) as any };
    }

    const labelledWidgets = ['string', 'text', 'number'];
    const inferredField = Object.entries(this.inferredFields)
      .filter(([key]) => {
        const fieldToMatch = selectField(this.props.collection, key);
        return fieldToMatch === field;
      })
      .map(([, value]) => value)[0];

    if (inferredField) {
      value = inferredField.defaultPreview(value);
    } else if (
      value &&
      labelledWidgets.indexOf(field.widget) !== -1 &&
      value.toString().length < 50
    ) {
      value = (
        <div>
          <strong>{String((field as any).label || field.name)}:</strong> {String(value)}
        </div>
      );
    }

    return value ? this.getWidget(field, value, metadata, this.props) : null;
  };

  /**
   * Retrieves widgets for nested fields (children of object/list fields)
   */
  getNestedWidgets = (fields: EntryField[], values: unknown, fieldsMetaData: unknown) => {
    // Fields nested within a list field will be paired with an array of value objects.
    if (Array.isArray(values)) {
      return values.map(value =>
        this.widgetsForNestedFields(fields, value, fieldsMetaData as Record<string, unknown>),
      );
    }
    // Fields nested within an object field will be paired with a single object of values.
    return this.widgetsForNestedFields(fields, values, fieldsMetaData as Record<string, unknown>);
  };

  getSingleNested = (field: EntryField, values: unknown, fieldsMetaData: unknown) => {
    if (Array.isArray(values)) {
      return values.map((value, idx) =>
        this.getWidget(
          field,
          value,
          (fieldsMetaData as Record<string, unknown>)?.[field.name],
          this.props,
          idx,
        ),
      );
    }
    return this.getWidget(
      field,
      values,
      (fieldsMetaData as Record<string, unknown>)?.[field.name],
      this.props,
    );
  };

  /**
   * Use widgetFor as a mapping function for recursive widget retrieval
   */
  widgetsForNestedFields = (
    fields: EntryField[],
    values: unknown,
    fieldsMetaData: Record<string, unknown>,
  ) => {
    return fields.map((field: EntryField) =>
      this.widgetFor(field.name, fields, values, fieldsMetaData),
    );
  };

  /**
   * This function exists entirely to expose nested widgets for object and list
   * fields to custom preview templates.
   *
   * TODO: see if widgetFor can now provide this functionality for preview templates
   */
  widgetsFor = (name: string) => {
    const { fields, entry, fieldsMetaData } = this.props;
    const field = fields.find(f => f.name === name);
    const nestedFields = field && field.fields;
    const variableTypes = field && field.types;
    const fieldName = field?.name ?? '';
    const value = (entry.data as Record<string, unknown>)?.[fieldName];
    const metadata = ((fieldsMetaData as Record<string, unknown>)?.[field?.name as string] ||
      {}) as Record<string, unknown>;

    // Variable Type lists
    if (Array.isArray(value) && variableTypes) {
      return value.map(val => {
        const valueType = variableTypes.find(
          (t: EntryField) => t.name === (val as Record<string, unknown>).type,
        );
        const typeFields = valueType && valueType.fields;
        const widgets: Record<string, React.ReactNode> = {};
        if (typeFields) {
          typeFields.forEach((f: EntryField, i: number) => {
            widgets[f.name] = (
              <div key={i}>
                {this.getWidget(f, val, (metadata as Record<string, unknown>)[f.name], this.props)}
              </div>
            );
          });
        }
        return { data: val, widgets };
      });
    }

    // List widgets
    if (Array.isArray(value)) {
      return value.map(val => {
        const widgets: Record<string, React.ReactNode> = {};
        if (nestedFields) {
          nestedFields.forEach((f: EntryField, i: number) => {
            widgets[f.name] = (
              <div key={i}>
                {this.getWidget(f, val, (metadata as Record<string, unknown>)[f.name], this.props)}
              </div>
            );
          });
        }
        return { data: val, widgets };
      });
    }

    const widgets: Record<string, React.ReactNode> = {};
    if (nestedFields) {
      nestedFields.forEach((f: EntryField) => {
        widgets[f.name] = this.getWidget(
          f,
          value,
          (metadata as Record<string, unknown>)[f.name],
          this.props,
        );
      });
    }
    return {
      data: value,
      widgets,
    };
  };

  /**
   * This function exists entirely to expose collections from outside of this entry
   *
   */
  getCollection = async (collectionName: string, slug?: string) => {
    const { state } = this.props;
    const selectedCollection = state.collections[collectionName];

    if (typeof slug === 'undefined') {
      const entries = await getAllEntries(state, selectedCollection);
      return entries.map((entry: { data: unknown }) => ({ data: entry.data }));
    }

    const entry = await tryLoadEntry(state, selectedCollection, slug);
    return { data: entry.data };
  };

  render() {
    const { entry, collection, config } = this.props;

    if (!entry || !entry.data) {
      return null;
    }

    const previewComponent =
      getPreviewTemplate(selectTemplateName(collection, entry.slug)) || EditorPreview;

    this.inferFields();

    const visualEditing = (collection as any)?.editor?.visualEditing ?? false;

    // Only encode entry data if visual editing is enabled
    const previewEntry = visualEditing
      ? {
          ...entry,
          data: encodeEntry(entry.data, this.props.fields as any),
        }
      : entry;

    const previewProps = {
      ...this.props,
      entry: previewEntry,
      widgetFor: (
        name: string,
        fields?: EntryField[],
        values: unknown = previewEntry.data,
        fieldsMetaData?: Record<string, unknown>,
      ) => this.widgetFor(name, fields, values, fieldsMetaData),
      widgetsFor: this.widgetsFor,
      getCollection: this.getCollection,
      getEditorComponents,
    };

    const styleEls = getPreviewStyles().map((style, i) => {
      if (style.raw) {
        return <style key={i}>{style.value}</style>;
      }
      return <link key={i} href={style.value} type="text/css" rel="stylesheet" />;
    });

    if (!collection) {
      <PreviewPaneFrame id="preview-pane" head={styleEls}>
        {null}
      </PreviewPaneFrame>;
    }

    const initialContent = `
<!DOCTYPE html>
<html>
  <head><base target="_blank"/></head>
  <body><div></div></body>
</html>
`;

    return (
      <ErrorBoundary config={config}>
        <PreviewPaneFrame id="preview-pane" head={styleEls} initialContent={initialContent}>
          <FrameContextConsumer>
            {({ document, window }) => {
              return (
                <EditorPreviewContent
                  previewComponent={previewComponent}
                  previewProps={{ ...previewProps, document, window }}
                  onFieldClick={this.props.onFieldClick}
                />
              );
            }}
          </FrameContextConsumer>
        </PreviewPaneFrame>
      </ErrorBoundary>
    );
  }
}

function mapStateToProps(state: any) {
  const isLoadingAsset = selectIsLoadingAsset(state.medias);
  return { isLoadingAsset, config: state.config, state };
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    boundGetAsset: (collection: Collection, entry: EntryMap) =>
      boundGetAsset(dispatch as any, collection, entry),
  };
}

function mergeProps(stateProps: any, dispatchProps: any, ownProps: any) {
  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    getAsset: dispatchProps.boundGetAsset(ownProps.collection, ownProps.entry),
  };
}

export default connect(mapStateToProps, mapDispatchToProps, mergeProps)(PreviewPane);
