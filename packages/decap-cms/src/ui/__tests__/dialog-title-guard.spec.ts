import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for DCMS-1471: every `showAlert()` / `confirmDialog()`
 * call site in `src/` must pass an options object with a truthy `title` so
 * the dialog's accessible name (aria-labelledby heading) reflects the
 * specific action instead of the generic "Alert" / "Confirm" default defined
 * in `ui/AlertDialog.tsx`. That default itself stays untouched, and
 * third-party integrators outside this repo are free to omit `title` - this
 * guard only scans this repo's own call sites.
 *
 * Approach: raw-source, balanced-paren scan rather than an AST pass, mirroring
 * `index.barrel.spec.ts`'s raw-import style - simple enough to keep this
 * test itself trustworthy at a glance.
 */

const sourceModules = import.meta.glob('../../**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const CALL_NAMES = ['showAlert', 'confirmDialog'];

function findCallArgSpans(source: string, callName: string): string[] {
  const spans: string[] = [];
  const pattern = new RegExp(`\\b${callName}\\s*\\(`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === '(') depth++;
      else if (source[i] === ')') depth--;
    }
    spans.push(source.slice(start, i - 1));
  }
  return spans;
}

describe('showAlert/confirmDialog call sites pass a title (DCMS-1471)', () => {
  const relevantFiles = Object.keys(sourceModules)
    .map(p => path.normalize(p))
    .filter(p => {
      const rel = p.split(path.sep).join('/');
      if (path.basename(rel) === 'AlertDialog.tsx') return false;
      if (/\.(spec|test|stories)\.[^/]+$/.test(rel)) return false;
      if (rel.includes('__tests__/')) return false;
      return true;
    });

  for (const file of relevantFiles) {
    const rel = file.split(path.sep).join('/');
    const source = sourceModules[Object.keys(sourceModules).find(k => path.normalize(k) === file)!];

    for (const callName of CALL_NAMES) {
      const argSpans = findCallArgSpans(source, callName);
      if (argSpans.length === 0) continue;

      it(`${rel}: every ${callName}() call passes a truthy title`, () => {
        for (const [index, args] of argSpans.entries()) {
          const hasTitle = /title\s*:\s*(['"`]|t\(|tt\()/.test(args) || /\btitle\s*,/.test(args)
            || /\btitle\s*}/.test(args);
          expect(
            hasTitle,
            `${rel}: ${callName}() call #${index + 1} is missing an options.title argument. `
              + `Call args: ${args.slice(0, 200)}`,
          ).toBe(true);
        }
      });
    }
  }
});
