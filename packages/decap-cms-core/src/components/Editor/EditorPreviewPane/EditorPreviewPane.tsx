import React from 'react';
import styled from '@emotion/styled';
import { List, Map } from 'immutable';
import type { List as ImmutableList, Map as ImmutableMap } from 'immutable';
import type { Collection, EntryMap, EntryField, CmsConfig, State } from '../../../types/cms';
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
  fields: ImmutableList<EntryField>;
  entry: EntryMap;
  fieldsMetaData: ImmutableMap<string, unknown>;
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
    const widget = resolveWidget(field.get('widget'));
    const key = idx ? field.get('name') + '_' + idx : field.get('name');
    const valueIsInMap =
      value && !(widget as any)?.allowMapValue && Map.isMap(value);

    /**
     * Use an HOC to provide conditional updates for all previews.
     */
    return !widget?.preview ? null : (
      <PreviewHOC
        previewComponent={widget.preview as unknown as React.ComponentType<Record<string, unknown>>}
        key={key}
        field={field}
        getAsset={getAsset}
        value={
          valueIsInMap
            ? (value as ImmutableMap<string, unknown>).get(field.get('name'))
            : (value as any)
        }
        {...({
          entry,
          fieldsMetaData: metadata as ImmutableMap<string, unknown>,
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
    fields: ImmutableList<EntryField> = this.props.fields,
    values: unknown = this.props.entry.get('data'),
    fieldsMetaData: ImmutableMap<string, unknown> = this.props.fieldsMetaData,
  ): React.ReactNode => {
    // We retrieve the field by name so that this function can also be used in
    // custom preview templates, where the field object can't be passed in.
    let field = fields && fields.find(f => f.get('name') === name);
    if (!field) return null;

    let value: any = Map.isMap(values) && (values as ImmutableMap<string, unknown>).get(field.get('name'));
    if (field.get('meta')) {
      value = this.props.entry.getIn(['meta', field.get('name')]);
    }

    const nestedFields = field.get('fields');
    const singleField = field.get('field');
    const metadata = fieldsMetaData && fieldsMetaData.get(field.get('name'), Map());

    if (nestedFields) {
      field = field.set('fields', this.getNestedWidgets(nestedFields, value, metadata) as any);
    }

    if (singleField) {
      field = field.set('field', this.getSingleNested(singleField, value, metadata) as any);
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
      labelledWidgets.indexOf(field.get('widget')) !== -1 &&
      value.toString().length < 50
    ) {
      value = (
        <div>
          <strong>{String((field as any).get('label', field.get('name')))}:</strong> {String(value)}
        </div>
      );
    }

    return value ? this.getWidget(field, value, metadata, this.props) : null;
  };

  /**
   * Retrieves widgets for nested fields (children of object/list fields)
   */
  getNestedWidgets = (
    fields: ImmutableList<EntryField>,
    values: unknown,
    fieldsMetaData: unknown,
  ) => {
    // Fields nested within a list field will be paired with a List of value Maps.
    if (List.isList(values)) {
      return (values as ImmutableList<unknown>).map(value =>
        this.widgetsForNestedFields(fields, value, fieldsMetaData as ImmutableMap<string, unknown>),
      );
    }
    // Fields nested within an object field will be paired with a single Map of values.
    return this.widgetsForNestedFields(fields, values, fieldsMetaData as ImmutableMap<string, unknown>);
  };

  getSingleNested = (
    field: EntryField,
    values: unknown,
    fieldsMetaData: unknown,
  ) => {
    if (List.isList(values)) {
      return (values as ImmutableList<unknown>).map((value, idx) =>
        this.getWidget(
          field,
          value,
          (fieldsMetaData as ImmutableMap<string, unknown>)?.get(field.get('name')),
          this.props,
          idx,
        ),
      );
    }
    return this.getWidget(
      field,
      values,
      (fieldsMetaData as ImmutableMap<string, unknown>)?.get(field.get('name')),
      this.props,
    );
  };

  /**
   * Use widgetFor as a mapping function for recursive widget retrieval
   */
  widgetsForNestedFields = (
    fields: ImmutableList<EntryField>,
    values: unknown,
    fieldsMetaData: ImmutableMap<string, unknown>,
  ) => {
    return fields.map((field: EntryField) =>
      this.widgetFor(field.get('name'), fields, values, fieldsMetaData),
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
    const field = fields.find(f => f.get('name') === name);
    const nestedFields = field && field.get('fields');
    const variableTypes = field && field.get('types');
    const fieldName = field?.get('name') ?? '';
    const value = entry.getIn(['data', fieldName]);
    const metadata = fieldsMetaData.get(field?.get('name') as string, Map()) as ImmutableMap<
      string,
      unknown
    >;

    // Variable Type lists
    if (List.isList(value) && variableTypes) {
      return (value as ImmutableList<any>).map(val => {
        const valueType = variableTypes.find(
          (t: EntryField) => t.get('name') === val.get('type'),
        );
        const typeFields = valueType && valueType.get('fields');
        const widgets =
          typeFields &&
          Map(
            typeFields.map((f: EntryField, i: number) => [
              f.get('name'),
              <div key={i}>
                {this.getWidget(f, val, (metadata as ImmutableMap<string, unknown>).get(f.get('name')), this.props)}
              </div>,
            ]),
          );
        return Map({ data: val, widgets });
      });
    }

    // List widgets
    if (List.isList(value)) {
      return (value as ImmutableList<any>).map(val => {
        const widgets =
          nestedFields &&
          Map(
            nestedFields.map((f: EntryField, i: number) => [
              f.get('name'),
              <div key={i}>
                {this.getWidget(f, val, (metadata as ImmutableMap<string, unknown>).get(f.get('name')), this.props)}
              </div>,
            ]),
          );
        return Map({ data: val, widgets });
      });
    }

    return Map({
      data: value,
      widgets:
        nestedFields &&
        Map(
          nestedFields.map((f: EntryField) => [
            f.get('name'),
            this.getWidget(f, value, (metadata as ImmutableMap<string, unknown>).get(f.get('name')), this.props),
          ]),
        ),
    });
  };

  /**
   * This function exists entirely to expose collections from outside of this entry
   *
   */
  getCollection = async (collectionName: string, slug?: string) => {
    const { state } = this.props;
    const selectedCollection = state.collections.get(collectionName);

    if (typeof slug === 'undefined') {
      const entries = await getAllEntries(state, selectedCollection);
      return entries.map((entry: { data: unknown }) => Map().set('data', entry.data));
    }

    const entry = await tryLoadEntry(state, selectedCollection, slug);
    return Map().set('data', entry.data);
  };

  render() {
    const { entry, collection, config } = this.props;

    if (!entry || !entry.get('data')) {
      return null;
    }

    const previewComponent =
      getPreviewTemplate(selectTemplateName(collection, entry.get('slug'))) || EditorPreview;

    this.inferFields();

    const visualEditing = (collection as any).getIn(['editor', 'visualEditing'], false);

    // Only encode entry data if visual editing is enabled
    const previewEntry = visualEditing
      ? entry.set(
          'data',
          encodeEntry(
            entry.get('data'),
            this.props.fields as unknown as ImmutableList<ImmutableMap<string, unknown>>,
          ),
        )
      : entry;

    const previewProps = {
      ...this.props,
      entry: previewEntry,
      widgetFor: (
        name: string,
        fields?: ImmutableList<EntryField>,
        values: unknown = previewEntry.get('data'),
        fieldsMetaData?: ImmutableMap<string, unknown>,
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

function mapStateToProps(state: State) {
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
