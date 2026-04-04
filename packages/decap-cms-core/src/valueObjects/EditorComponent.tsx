import { fromJS, List } from 'immutable';
import isFunction from 'lodash/isFunction';

import type {
  EditorComponentOptions,
  EditorComponentPlugin,
  EditorComponentField,
} from '../types/cms';

const catchesNothing = /.^/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  config: EditorComponentConfig
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
    fields: fromJS(fields) as unknown as List<EditorComponentField>,
    ...remainingConfig,
  } as EditorComponentPlugin;
}
