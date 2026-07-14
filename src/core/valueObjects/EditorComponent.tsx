import isFunction from 'lodash/isFunction';

import type {
  CmsEditorComponentOptions,
  CmsEditorComponentPlugin,
  CmsEditorComponentField,
} from '@/lib/util/index';

type EditorComponentOptions = CmsEditorComponentOptions;
type EditorComponentPlugin = CmsEditorComponentPlugin;
type EditorComponentField = CmsEditorComponentField;

const catchesNothing = /.^/;

type AnyFunction = (...args: any[]) => any;

type EditorComponentConfig = Partial<EditorComponentOptions> & {
  label?: string;
  icon?: string;
  widget?: string;
  type?: 'code-block' | 'shortcode';
};

function bind(fn: AnyFunction | undefined): AnyFunction | false {
  return isFunction(fn) && fn.bind(null);
}

export default function createEditorComponent(
  config: EditorComponentConfig,
): EditorComponentPlugin {
  const {
    id = null,
    label = 'unnamed component',
    icon = 'exclamation-triangle',
    type = 'shortcode',
    widget = 'object',
    pattern = catchesNothing,
    fields = [],
    fromBlock,
    toBlock,
    toPreview,
    ...remainingConfig
  } = config;

  return {
    id: id || label.replace(/[^A-Z0-9]+/gi, '_'),
    label,
    type,
    icon,
    widget,
    pattern,
    fromBlock: bind(fromBlock) || (() => ({})),
    toBlock: bind(toBlock) || (() => 'Plugin'),
    toPreview: bind(toPreview) || (!widget && (bind(toBlock) || (() => 'Plugin'))),
    fields: fields as EditorComponentField[],
    ...remainingConfig,
  } as EditorComponentPlugin;
}
