import yaml from 'yaml';

import { validateConfig } from '@/core/lib/validateConfig';

import type { SchemaError } from '@/core/lib/jsonSchemaValidator';
import type { CmsConfig } from '@/lib/util/index';

/**
 * The save-guard for the in-CMS config editor (DCMS-1418): parse the raw
 * YAML text the user is editing, then run it through the exact same
 * `validateConfig` used at CMS boot. Nothing here re-implements validation —
 * a broken config is only ever detected by the one schema validator the rest
 * of the app already trusts, so this guard and boot-time validation can never
 * disagree.
 */
export interface ConfigEditorValidationResult {
  valid: boolean;
  /** The parsed config, only set when `valid` is `true`. */
  config?: CmsConfig;
  /** Human-readable error lines to show in the editor; empty when valid. */
  errors: string[];
  /** Present only for schema-validation failures (not YAML parse errors). */
  schemaErrors?: SchemaError[];
}

function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Parses `raw` as YAML and validates the result with `validateConfig`.
 * Returns a result object rather than throwing, so callers (the editor's
 * live-validation UI and its save handler) don't need their own try/catch —
 * this is the single choke point a save action must pass through before it
 * is allowed to commit.
 */
export function validateConfigYaml(raw: string): ConfigEditorValidationResult {
  let parsed: unknown;
  try {
    parsed = yaml.parse(raw);
  } catch (error) {
    return { valid: false, errors: [messageFromUnknown(error)] };
  }

  if (parsed === null || parsed === undefined) {
    return { valid: false, errors: ['Config cannot be empty.'] };
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, errors: ['Config must be a YAML mapping (an object), not a scalar or list.'] };
  }

  try {
    validateConfig(parsed as Record<string, unknown>);
  } catch (error) {
    const schemaErrors = (error as { errors?: SchemaError[] }).errors;
    const message = messageFromUnknown(error);
    return {
      valid: false,
      errors: message ? message.split('\n') : ['Invalid config.'],
      schemaErrors,
    };
  }

  return { valid: true, config: parsed as CmsConfig, errors: [] };
}
