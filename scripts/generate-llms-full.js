// Regenerates llms-full.txt: the llms.txt index with every linked doc's
// content inlined in place, per the llms.txt/llms-full.txt convention
// (https://llmstxt.org/). Run with `npm run docs:llms`.
//
// This is a plain concatenation script, not a build-graph task, so it isn't
// wired into `npm run build` or CI — invoke it manually after editing
// llms.txt or any doc it links to.
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const llmsTxtPath = path.join(rootDir, 'llms.txt');
const outPath = path.join(rootDir, 'llms-full.txt');

const linkPattern = /\[([^\]]+)\]\((?!https?:\/\/)([^)]+\.md)\)/g;

function main() {
  const index = fs.readFileSync(llmsTxtPath, 'utf8');
  const seen = new Set();
  const sections = [];

  let match;
  while ((match = linkPattern.exec(index)) !== null) {
    const [, label, relPath] = match;
    if (seen.has(relPath)) continue;
    seen.add(relPath);

    const absPath = path.join(rootDir, relPath);
    if (!fs.existsSync(absPath)) {
      console.warn(`[generate-llms-full] skipping missing file: ${relPath}`);
      continue;
    }

    const content = fs.readFileSync(absPath, 'utf8').trim();
    sections.push(`<!-- source: ${relPath} (${label}) -->\n\n${content}`);
  }

  const output = `${index.trim()}\n\n---\n\n${sections.join('\n\n---\n\n')}\n`;
  fs.writeFileSync(outPath, output);
  console.log(`[generate-llms-full] wrote ${outPath} (${sections.length} docs inlined)`);
}

main();
