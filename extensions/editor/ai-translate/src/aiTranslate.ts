/**
 * One-click AI translation of entry content (DCMS-1395)
 *
 * Pure helpers that build the AI instruction message and parse tool-call
 * output. Kept framework-free so they're trivially unit-testable; the React
 * wiring lives in `useAiTranslate.ts`.
 */

export interface TranslatableFieldValue {
  name: string;
  value: unknown;
}

/**
 * Builds the user-facing instruction sent to the existing `/chat` AI adapter
 * endpoint (see `src/ai/decap-ai.ts`). Reuses the `updateDocument` client-side
 * tool already wired in `src/ai/tools/document-tools.ts` — the AI is asked to
 * respond with JSON Patch operations rather than free text so results can be
 * applied field-by-field the same way the existing chat widget does.
 */
export function buildTranslatePrompt({
  sourceLocale,
  targetLocale,
  fields,
}: {
  sourceLocale: string,
  targetLocale: string,
  fields: TranslatableFieldValue[],
}): string {
  const fieldList = fields
    .map(f => `- "${f.name}": ${JSON.stringify(f.value)}`)
    .join('\n');

  return [
    `Translate the following field values from locale "${sourceLocale}" to locale "${targetLocale}".`,
    `Preserve markdown/formatting structure exactly and only translate human-readable text (do not translate code, URLs, slugs, or shortcodes).`,
    `For every field below, call the updateDocument tool with one JSON Patch operation per field: use "add" if the field does not already exist in the target document, otherwise "replace". The path is "/" followed by the exact field name.`,
    `Do not add, remove, or rename fields. Do not translate fields that are not listed below.`,
    ``,
    `Fields to translate:`,
    fieldList,
  ].join('\n');
}

/**
 * Extracts `{ fieldName: translatedValue }` pairs from JSON Patch operations
 * produced by the `updateDocument` tool, restricted to the known translatable
 * field names (defensive: ignores paths the AI invented or nested paths).
 */
export function extractTranslatedFields(
  operations: { op: string, path: string, value?: unknown }[],
  knownFieldNames: string[],
): TranslatableFieldValue[] {
  const known = new Set(knownFieldNames);
  const results: TranslatableFieldValue[] = [];

  for (const op of operations) {
    if (op.op !== 'add' && op.op !== 'replace') continue;
    const match = /^\/([^/]+)$/.exec(op.path);
    if (!match) continue;
    const fieldName = match[1];
    if (!known.has(fieldName)) continue;
    results.push({ name: fieldName, value: op.value });
  }

  return results;
}
