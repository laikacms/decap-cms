import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Pins the class of bug in DCMS-1342: docs/core/slots.md documented the
// `renderWorkflowCard` slot's consumer as `WorkflowList.tsx:168`, but the
// file had drifted (that line ended up inside an unrelated comment) and the
// real `useCmsSlots()` call reading `renderWorkflowCard` moved to line 209.
// Nothing caught the drift because the `Consumer:`/`Consumers:` file:line
// references under each `### `slotName`` heading in slots.md were never
// checked against the actual source.
//
// This test parses every `### `slotName`` section in slots.md, extracts its
// backtick-quoted `path:line` consumer reference(s), and asserts the
// referenced line in the real source file still mentions that slot's key
// name — so a future rename/move of the `useCmsSlots()` call fails CI
// instead of silently drifting again.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const SLOTS_DOC = path.join(REPO_ROOT, 'docs/core/slots.md');

// A `### `slotName`` section heading.
const SLOT_HEADING = /^### `(\w+)`$/;

// Any heading that ends a slot's section (a new `##`/`###` heading).
const ANY_HEADING = /^#{2,3} /;

// A backtick-quoted `path:line` consumer reference, e.g.
// `` `packages/decap-cms/src/core/components/Workflow/WorkflowList.tsx:209` ``.
const CONSUMER_REFERENCE = /`([\w./-]+\.tsx?):(\d+)`/g;

interface ConsumerRef {
  slotName: string;
  file: string;
  line: number;
}

// Line-based rather than a single big regex: slot sections are delimited by
// heading lines, and a lazy-match-until-next-heading regex is error-prone
// with the `m` flag (`$` matches at *every* line end, including blank lines
// inside a section, so a naive lookahead terminates the section early).
function parseConsumerRefs(markdown: string): ConsumerRef[] {
  const refs: ConsumerRef[] = [];
  let currentSlot: string | null = null;

  for (const line of markdown.split('\n')) {
    const headingMatch = line.match(SLOT_HEADING);
    if (headingMatch) {
      currentSlot = headingMatch[1];
      continue;
    }
    if (ANY_HEADING.test(line)) {
      currentSlot = null;
      continue;
    }
    if (currentSlot === null) continue;

    for (const refMatch of line.matchAll(CONSUMER_REFERENCE)) {
      const [, file, lineStr] = refMatch;
      refs.push({ slotName: currentSlot, file, line: Number(lineStr) });
    }
  }

  return refs;
}

describe('docs/core/slots.md: consumer line references stay in sync (DCMS-1342)', () => {
  it('every `### `slotName`` Consumer file:line reference points at a line mentioning that slot', () => {
    const markdown = fs.readFileSync(SLOTS_DOC, 'utf8');
    const refs = parseConsumerRefs(markdown);

    // Sanity check: the parse above should find real references, not just
    // fail closed because the section regex stopped matching anything.
    expect(refs.length).toBeGreaterThan(0);

    const offenders: string[] = [];

    for (const ref of refs) {
      const sourcePath = path.join(REPO_ROOT, ref.file);
      if (!fs.existsSync(sourcePath)) {
        offenders.push(`${ref.slotName}: consumer file does not exist: ${ref.file}`);
        continue;
      }

      const lines = fs.readFileSync(sourcePath, 'utf8').split('\n');
      const referencedLine = lines[ref.line - 1];

      if (referencedLine === undefined) {
        offenders.push(
          `${ref.slotName}: ${ref.file}:${ref.line} is past the end of the file (${lines.length} lines)`,
        );
        continue;
      }

      if (!new RegExp(`\\b${ref.slotName}\\b`).test(referencedLine)) {
        offenders.push(
          `${ref.slotName}: ${ref.file}:${ref.line} doesn't mention \`${ref.slotName}\` (found: ${referencedLine.trim()})`,
        );
      }
    }

    // If this fails, a slots.md `Consumer:`/`Consumers:` line reference has
    // drifted from the actual `useCmsSlots()` call site. Update the line
    // number in slots.md (see DCMS-1342, where WorkflowList.tsx's
    // `renderWorkflowCard` consumer moved from line 168 to 209).
    expect(offenders).toEqual([]);
  });
});
