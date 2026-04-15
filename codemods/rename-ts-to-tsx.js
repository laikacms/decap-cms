/**
 * Codemod #1: Rename .ts files containing JSX to .tsx
 *
 * Uses jscodeshift to parse each .ts file with the tsx parser and detect
 * JSXElement/JSXFragment nodes. Files containing JSX are renamed from .ts
 * to .tsx using git mv, and all import references are updated.
 *
 * Usage:
 *   node codemods/rename-ts-to-tsx.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const j = require('jscodeshift');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');

/**
 * Recursively find all .ts files (not .d.ts, not .tsx) under a directory.
 */
function findTsFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      findTsFiles(fullPath, results);
    } else if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Detect if a .ts file contains JSX using jscodeshift's tsx parser.
 */
function fileContainsJSX(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');

  try {
    const root = j.withParser('tsx')(source);
    const hasJSXElement = root.find(j.JSXElement).length > 0;
    const hasJSXFragment = root.find(j.JSXFragment).length > 0;
    return hasJSXElement || hasJSXFragment;
  } catch (e) {
    // If parsing fails, fall back to regex detection
    console.warn(`  ⚠️  Parse error in ${path.relative(ROOT, filePath)}: ${e.message}`);
    // Look for JSX-like return patterns
    return /return\s*\(\s*<|return\s+<|=>\s*\(\s*<|=>\s*</.test(source);
  }
}

/**
 * Find all source files that might contain imports to update.
 */
function findAllSourceFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      findAllSourceFiles(fullPath, results);
    } else if (
      (entry.name.endsWith('.ts') ||
        entry.name.endsWith('.tsx') ||
        entry.name.endsWith('.js') ||
        entry.name.endsWith('.jsx')) &&
      !entry.name.endsWith('.d.ts')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Update import paths in a file that reference a renamed module.
 * Handles both explicit .ts extensions and extensionless imports.
 */
function updateImportsInFile(filePath, renamedFiles) {
  let source = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const fileDir = path.dirname(filePath);

  for (const { oldPath } of renamedFiles) {
    const oldBasename = path.basename(oldPath, '.ts');
    const oldDir = path.dirname(oldPath);

    // Calculate relative path from current file to the renamed file (without extension)
    let relPath = path.relative(fileDir, path.join(oldDir, oldBasename));
    if (!relPath.startsWith('.')) {
      relPath = './' + relPath;
    }

    // Replace imports with explicit .ts extension → .tsx
    const tsExtPattern = new RegExp(
      `(from\\s+['"])` + escapeRegex(relPath) + `\\.ts(['"])`,
      'g',
    );
    const newSource1 = source.replace(tsExtPattern, `$1${relPath}.tsx$2`);
    if (newSource1 !== source) {
      source = newSource1;
      modified = true;
    }

    // Replace require() with explicit .ts extension → .tsx
    const requireTsPattern = new RegExp(
      `(require\\s*\\(\\s*['"])` + escapeRegex(relPath) + `\\.ts(['"]\\s*\\))`,
      'g',
    );
    const newSource2 = source.replace(requireTsPattern, `$1${relPath}.tsx$2`);
    if (newSource2 !== source) {
      source = newSource2;
      modified = true;
    }
  }

  if (modified && !DRY_RUN) {
    fs.writeFileSync(filePath, source, 'utf8');
  }

  return modified;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('🔍 Scanning for .ts files containing JSX...\n');

  const tsFiles = findTsFiles(PACKAGES_DIR);
  console.log(`Found ${tsFiles.length} .ts files to check.\n`);

  const filesToRename = [];

  for (const filePath of tsFiles) {
    if (fileContainsJSX(filePath)) {
      const newPath = filePath.replace(/\.ts$/, '.tsx');
      filesToRename.push({ oldPath: filePath, newPath });
      const rel = path.relative(ROOT, filePath);
      console.log(`  ✅ ${rel} → ${rel.replace(/\.ts$/, '.tsx')}`);
    }
  }

  if (filesToRename.length === 0) {
    console.log('\nNo .ts files with JSX found. Nothing to do.');
    return;
  }

  console.log(`\n📝 Found ${filesToRename.length} files to rename.\n`);

  if (DRY_RUN) {
    console.log('🏃 Dry run mode — no files will be modified.\n');
    return;
  }

  // Step 1: Rename files using git mv for proper tracking
  console.log('📦 Renaming files...');
  for (const { oldPath, newPath } of filesToRename) {
    try {
      execSync(`git mv "${oldPath}" "${newPath}"`, { cwd: ROOT, stdio: 'pipe' });
    } catch {
      // If git mv fails (file not tracked), fall back to regular rename
      fs.renameSync(oldPath, newPath);
    }
    console.log(`  Renamed: ${path.relative(ROOT, oldPath)}`);
  }

  // Step 2: Update imports in all source files
  console.log('\n🔗 Updating import references...');
  const allSourceFiles = findAllSourceFiles(PACKAGES_DIR);
  let updatedCount = 0;

  for (const sourceFile of allSourceFiles) {
    if (updateImportsInFile(sourceFile, filesToRename)) {
      updatedCount++;
      console.log(`  Updated imports in: ${path.relative(ROOT, sourceFile)}`);
    }
  }

  console.log(
    `\n✨ Done! Renamed ${filesToRename.length} files, updated imports in ${updatedCount} files.`,
  );
}

main();
