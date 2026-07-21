import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';
import { List, Map } from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Frame, { FrameContextConsumer } from 'react-frame-component';
import { lengths } from 'decap-cms-ui-default';
import { connect } from 'react-redux';

import { encodeEntry } from '../../../lib/stega';
import { isVisible } from '../../../lib/widgets';
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

// DCMS-1289: preview content is arbitrary, user-supplied markup (a custom
// preview component, or the demo PostPreview's <h1>{entry.data.title}</h1>).
// A long unbroken string (URL, API token, hex digest) has no natural break
// point, so without this it overflows the iframe's initial containing block
// instead of wrapping. Mirrors the fix landed on v4.beta in PR #982.
export const PREVIEW_FRAME_INITIAL_CONTENT = `
<!DOCTYPE html>
<html>
  <head>
    <base target="_blank"/>
    <style>
      html, body {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    </style>
  </head>
  <body><div></div></body>
</html>
`;

export class PreviewPane extends React.Component {
  getWidget = (field, value, metadata, props, idx = null) => {
    // The `hidden` widget has no registered control/preview, so resolving it
    // would fall through to the generic "unknown widget" preview and leak a
    // "No preview for widget 'hidden'." notice. Hidden fields must never
    // produce preview output, regardless of which call site reaches here
    // (top-level widgetFor, singular nested fields, or the widgetsFor API
    // exposed to custom preview templates).
    if (!isVisible(field)) {
      return null;
    }

    const { getAsset, entry } = props;
    const widget = resolveWidget(field.get('widget'));
    const key = idx ? field.get('name') + '_' + idx : field.get('name');
    const valueIsInMap = value && !widget.allowMapValue && Map.isMap(value);

    /**
     * Use an HOC to provide conditional updates for all previews.
     */
    return !widget.preview ? null : (
      <PreviewHOC
        previewComponent={widget.preview}
        key={key}
        field={field}
        getAsset={getAsset}
        value={valueIsInMap ? value.get(field.get('name')) : value}
        entry={entry}
        fieldsMetaData={metadata}
        resolveWidget={resolveWidget}
        getRemarkPlugins={getRemarkPlugins}
        getEditorComponents={getEditorComponents}
      />
    );
  };

  inferredFields = {};

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
    name,
    fields = this.props.fields,
    values = this.props.entry.get('data'),
    fieldsMetaData = this.props.fieldsMetaData,
  ) => {
    // We retrieve the field by name so that this function can also be used in
    // custom preview templates, where the field object can't be passed in.
    let field = fields && fields.find(f => f.get('name') === name);
    if (!field || !isVisible(field)) {
      return null;
    }
    let value = Map.isMap(values) && values.get(field.get('name'));
    if (field.get('meta')) {
      value = this.props.entry.getIn(['meta', field.get('name')]);
    }

    const nestedFields = field.get('fields');
    const singleField = field.get('field');
    const metadata = fieldsMetaData && fieldsMetaData.get(field.get('name'), Map());

    if (nestedFields) {
      field = field.set('fields', this.getNestedWidgets(nestedFields, value, metadata));
    }

    if (singleField) {
      field = field.set('field', this.getSingleNested(singleField, value, metadata));
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
          <strong>{field.get('label', field.get('name'))}:</strong> {value}
        </div>
      );
    }

    return value ? this.getWidget(field, value, metadata, this.props) : null;
  };

  /**
   * Retrieves widgets for nested fields (children of object/list fields)
   */
  getNestedWidgets = (fields, values, fieldsMetaData) => {
    // Fields nested within a list field will be paired with a List of value Maps.
    if (List.isList(values)) {
      return values.map(value => this.widgetsForNestedFields(fields, value, fieldsMetaData));
    }
    // Fields nested within an object field will be paired with a single Map of values.
    return this.widgetsForNestedFields(fields, values, fieldsMetaData);
  };

  getSingleNested = (field, values, fieldsMetaData) => {
    if (List.isList(values)) {
      return values.map((value, idx) =>
        this.getWidget(field, value, fieldsMetaData.get(field.get('name')), this.props, idx),
      );
    }
    return this.getWidget(field, values, fieldsMetaData.get(field.get('name')), this.props);
  };

  /**
   * Use widgetFor as a mapping function for recursive widget retrieval
   */
  widgetsForNestedFields = (fields, values, fieldsMetaData) => {
    return fields.map(field => this.widgetFor(field.get('name'), fields, values, fieldsMetaData));
  };

  /**
   * This function exists entirely to expose nested widgets for object and list
   * fields to custom preview templates.
   *
   * TODO: see if widgetFor can now provide this functionality for preview templates
   */
  widgetsFor = name => {
    const { fields, entry, fieldsMetaData } = this.props;
    const field = fields.find(f => f.get('name') === name);
    const nestedFields = field && field.get('fields');
    const variableTypes = field && field.get('types');
    const value = entry.getIn(['data', field.get('name')]);
    const metadata = fieldsMetaData.get(field.get('name'), Map());

    // Variable Type lists
    if (List.isList(value) && variableTypes) {
      return value.map(val => {
        const valueType = variableTypes.find(t => t.get('name') === val.get('type'));
        const typeFields = valueType && valueType.get('fields');
        const widgets =
          typeFields &&
          Map(
            typeFields.map((f, i) => [
              f.get('name'),
              <div key={i}>{this.getWidget(f, val, metadata.get(f.get('name')), this.props)}</div>,
            ]),
          );
        return Map({ data: val, widgets });
      });
    }

    // List widgets
    if (List.isList(value)) {
      return value.map(val => {
        const widgets =
          nestedFields &&
          Map(
            nestedFields.map((f, i) => [
              f.get('name'),
              <div key={i}>{this.getWidget(f, val, metadata.get(f.get('name')), this.props)}</div>,
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
          nestedFields.map(f => [
            f.get('name'),
            this.getWidget(f, value, metadata.get(f.get('name')), this.props),
          ]),
        ),
    });
  };

  /**
   * This function exists entirely to expose collections from outside of this entry
   *
   */
  getCollection = async (collectionName, slugToLoad) => {
    const { state } = this.props;
    const selectedCollection = state.collections.get(collectionName);

    if (typeof slugToLoad === 'undefined') {
      const entries = await getAllEntries(state, selectedCollection);

      return entries.map(({ data, slug, path }) => Map({ data, slug, path }));
    }

    const { data, slug, path } = await tryLoadEntry(state, selectedCollection, slugToLoad);
    return Map({ data, slug, path });
  };

  render() {
    const { entry, collection, config } = this.props;

    if (!entry || !entry.get('data')) {
      return null;
    }

    const previewComponent =
      getPreviewTemplate(selectTemplateName(collection, entry.get('slug'))) || EditorPreview;

    this.inferFields();

    const visualEditing = collection.getIn(['editor', 'visualEditing'], false);

    // Only encode entry data if visual editing is enabled
    const previewEntry = visualEditing
      ? entry.set('data', encodeEntry(entry.get('data'), this.props.fields))
      : entry;

    const previewProps = {
      ...this.props,
      entry: previewEntry,
      widgetFor: (name, fields, values = previewEntry.get('data'), fieldsMetaData) =>
        this.widgetFor(name, fields, values, fieldsMetaData),
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
      <PreviewPaneFrame id="preview-pane" head={styleEls} />;
    }

    const initialContent = PREVIEW_FRAME_INITIAL_CONTENT;

    return (
      <ErrorBoundary config={config}>
        <PreviewPaneFrame id="preview-pane" head={styleEls} initialContent={initialContent}>
          <FrameContextConsumer>
            {({ document, window }) => {
              return (
                <EditorPreviewContent
                  {...{ previewComponent, previewProps: { ...previewProps, document, window } }}
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

PreviewPane.propTypes = {
  collection: ImmutablePropTypes.map.isRequired,
  fields: ImmutablePropTypes.list.isRequired,
  entry: ImmutablePropTypes.map.isRequired,
  fieldsMetaData: ImmutablePropTypes.map.isRequired,
  getAsset: PropTypes.func.isRequired,
  onFieldClick: PropTypes.func,
};

function mapStateToProps(state) {
  const isLoadingAsset = selectIsLoadingAsset(state.medias);
  // Pass only the slices needed by getCollection → getAllEntries / tryLoadEntry,
  // rather than the entire store, to avoid re-rendering on every state change.
  //
  // Slices included and why:
  //   config       — currentBackend(state.config) in getAllEntries + tryLoadEntry
  //   collections  — state.collections.get(collectionName) in getCollection itself
  //   integrations — selectIntegration(state, …) / getIntegrationProvider(state.integrations, …)
  //   mediaLibrary — processEntry reads state.mediaLibrary.get('files')
  //   entries      — selectIsFetching / selectEntriesSortFields read state.entries in the
  //                  sort/filter/loadEntries paths that getAllEntries can trigger; also
  //                  selectEntryByPath(state.entries, …) in validateMetaField
  const collectionState = {
    config: state.config,
    collections: state.collections,
    integrations: state.integrations,
    mediaLibrary: state.mediaLibrary,
    entries: state.entries,
  };
  return { isLoadingAsset, config: state.config, state: collectionState };
}

function mapDispatchToProps(dispatch) {
  return {
    boundGetAsset: (collection, entry) => boundGetAsset(dispatch, collection, entry),
  };
}

function mergeProps(stateProps, dispatchProps, ownProps) {
  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    getAsset: dispatchProps.boundGetAsset(ownProps.collection, ownProps.entry),
  };
}

export default connect(mapStateToProps, mapDispatchToProps, mergeProps)(PreviewPane);
