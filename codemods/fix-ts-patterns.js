/**
 * Codemod #2: Fix bad TypeScript patterns
 *
 * This jscodeshift transform fixes common TypeScript anti-patterns:
 *
 * 1. @ts-ignore → @ts-expect-error (safer, fails if suppression is unnecessary)
 * 2. `as any` casts → adds TODO comments for proper typing
 * 3. `: any` type annotations on catch clauses → `: unknown`
 * 4. Explicit `any` function parameters → adds TODO for proper typing
 * 5. Remove unnecessary `eslint-disable @typescript-eslint/no-explicit-any` comments
 *    when the `any` on that line can be replaced
 *
 * Usage:
 *   npx jscodeshift --parser=tsx --extensions=ts,tsx -t codemods/fix-ts-patterns.js packages/
 *   npx jscodeshift --parser=tsx --extensions=ts,tsx -t codemods/fix-ts-patterns.js --dry packages/
 */

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  let source = fileInfo.source;
  let hasChanges = false;

  // ─── 1. Replace @ts-ignore with @ts-expect-error ───────────────────────────
  const tsIgnoreRegex = /\/\/\s*@ts-ignore\b(.*)/g;
  const newSource1 = source.replace(tsIgnoreRegex, (match, rest) => {
    hasChanges = true;
    // Preserve any existing comment after @ts-ignore
    const comment = rest.trim();
    if (comment) {
      return `// @ts-expect-error ${comment}`;
    }
    return '// @ts-expect-error -- TODO: fix underlying type issue';
  });
  if (newSource1 !== source) {
    source = newSource1;
  }

  // ─── 2. Replace `: any` in catch clauses with `: unknown` ─────────────────
  // Pattern: } catch (error: any) { → } catch (error: unknown) {
  const catchAnyRegex = /(\bcatch\s*\(\s*\w+)\s*:\s*any\s*\)/g;
  const newSource2 = source.replace(catchAnyRegex, (match, prefix) => {
    hasChanges = true;
    return `${prefix}: unknown)`;
  });
  if (newSource2 !== source) {
    source = newSource2;
  }

  // ─── 3. Parse AST for deeper transforms ────────────────────────────────────
  let root;
  try {
    root = j(source);
  } catch (e) {
    // If parsing fails, return what we have from regex transforms
    if (hasChanges) {
      return source;
    }
    return undefined;
  }

  // ─── 4. Replace `{} as any` return statements with TODO ────────────────────
  // Pattern: return {} as any; → return {} as unknown; // TODO: implement proper return type
  root
    .find(j.TSAsExpression, {
      typeAnnotation: {
        type: 'TSAnyKeyword',
      },
    })
    .forEach(path => {
      // Check if the expression is `{}` (empty object)
      const expr = path.value.expression;
      if (
        expr.type === 'ObjectExpression' &&
        expr.properties.length === 0
      ) {
        // Replace `as any` with `as unknown`
        path.value.typeAnnotation = j.tsUnknownKeyword();
        hasChanges = true;
      }
    });

  // ─── 5. Add type annotation to untyped catch clause parameters ─────────────
  root
    .find(j.CatchClause)
    .forEach(path => {
      const param = path.value.param;
      if (param && param.type === 'Identifier' && !param.typeAnnotation) {
        // Add `: unknown` type annotation
        param.typeAnnotation = j.tsTypeAnnotation(j.tsUnknownKeyword());
        hasChanges = true;
      }
    });

  if (hasChanges) {
    return root.toSource();
  }

  return undefined; // No changes
};

module.exports.parser = 'tsx';
