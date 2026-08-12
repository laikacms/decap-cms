import { readdirSync, readFileSync } from 'node:fs';

// DCMS-2033: CONTRIBUTING.md's command reference table hardcodes a `tsc`
// invocation count next to `pnpm typecheck`. Root `pnpm typecheck` is
// `pnpm -r run typecheck`, which fans out across every packages/*
// `typecheck` script, so the doc's count silently drifted when
// decap-cms-lib-pat gained its own `typecheck` script. Pin the doc's count
// to the real sum so it self-corrects (or fails CI) whenever a package's
// `typecheck` script changes shape or a new package is added.

const packageDirs = readdirSync(new URL('../packages/', import.meta.url), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

let actualTscInvocations = 0;
for (const name of packageDirs) {
  const pkgJsonPath = new URL(`../packages/${name}/package.json`, import.meta.url);
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const typecheckScript = pkgJson.scripts?.typecheck;
  if (typeof typecheckScript !== 'string') continue;
  const matches = typecheckScript.match(/(?<![\w/-])tsc(?![\w/-])/g) ?? [];
  actualTscInvocations += matches.length;
}

const contributingPath = new URL('../CONTRIBUTING.md', import.meta.url);
const contributing = readFileSync(contributingPath, 'utf8');

const tableRowPattern = /\|\s*`pnpm typecheck`\s*\|[^|]*\((\d+)\s*`tsc`\s*invocations?\)\s*\|/;
const match = contributing.match(tableRowPattern);

if (!match) {
  throw new Error(
    'CONTRIBUTING.md is missing a `pnpm typecheck` command-table row with a "(N `tsc` invocations)" count. '
      + 'Update the row or this check\'s pattern.',
  );
}

const documentedTscInvocations = Number(match[1]);

if (documentedTscInvocations !== actualTscInvocations) {
  throw new Error(
    `CONTRIBUTING.md says "pnpm typecheck" runs ${documentedTscInvocations} \`tsc\` invocation(s), `
      + `but summing the "typecheck" script across packages/* (${packageDirs.join(', ')}) gives ${actualTscInvocations}. `
      + 'Update the CONTRIBUTING.md command table row to match.',
  );
}

console.log(
  `CONTRIBUTING.md "pnpm typecheck" tsc-invocation count (${documentedTscInvocations}) matches the sum across packages/* (${actualTscInvocations}).`,
);
