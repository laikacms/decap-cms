#!/usr/bin/env node
/**
 * Runner script: Execute all codemods in the correct order.
 *
 * Usage:
 *   node codemods/run-all.js [--dry-run] [--step=N]
 *
 * Options:
 *   --dry-run   Preview changes without modifying files
 *   --step=N    Run only step N (1, 2, or 3)
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const stepArg = process.argv.find(a => a.startsWith('--step='));
const ONLY_STEP = stepArg ? parseInt(stepArg.split('=')[1], 10) : null;

function run(cmd, label) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(70)}\n`);
  console.log(`> ${cmd}\n`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error(`\n❌ Step failed with exit code ${e.status}`);
    if (!DRY_RUN) {
      console.error('Stopping. Fix the issue and re-run, or use --step=N to skip ahead.');
      process.exit(1);
    }
  }
}

const dryFlag = DRY_RUN ? '--dry-run' : '';
const jscsDryFlag = DRY_RUN ? '--dry --print' : '';

// ─── Step 1: Rename .ts → .tsx for files containing JSX ─────────────────────
if (!ONLY_STEP || ONLY_STEP === 1) {
  run(
    `node codemods/rename-ts-to-tsx.js ${dryFlag}`,
    'Step 1/3: Rename .ts files containing JSX to .tsx',
  );
}

// ─── Step 2: Fix bad TypeScript patterns ─────────────────────────────────────
if (!ONLY_STEP || ONLY_STEP === 2) {
  run(
    `npx jscodeshift --parser=tsx --extensions=ts,tsx -t codemods/fix-ts-patterns.js ${jscsDryFlag} packages/`,
    'Step 2/3: Fix bad TypeScript patterns (@ts-ignore → @ts-expect-error, catch any → unknown, etc.)',
  );
}

// ─── Step 3: Extract TypeScript interfaces from PropTypes ────────────────────
if (!ONLY_STEP || ONLY_STEP === 3) {
  run(
    `npx jscodeshift --parser=tsx --extensions=ts,tsx -t codemods/proptypes-to-ts.js ${jscsDryFlag} packages/`,
    'Step 3/3: Extract TypeScript interfaces from PropTypes (keeping PropTypes)',
  );
}

console.log(`\n${'═'.repeat(70)}`);
if (DRY_RUN) {
  console.log('  🏃 Dry run complete — no files were modified.');
} else {
  console.log('  ✨ All codemods applied successfully!');
  console.log('  Run `pnpm type-check` to verify the changes.');
}
console.log(`${'═'.repeat(70)}\n`);
