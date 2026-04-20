#!/usr/bin/env node
/**
 * Codemod to fix common TypeScript issues in Cypress e2e test files
 * 
 * Fixes:
 * 1. taskResult.data.user -> (taskResult.data as TaskDataResult).user
 * 2. taskResult.data.forkUser -> (taskResult.data as TaskDataResult).forkUser
 * 3. taskResult.data.tempDir -> (taskResult.data as TaskDataResult).tempDir
 * 4. Adds type annotations to taskResult declarations
 */

const fs = require('fs');
const path = require('path');

const cypressE2eDir = path.join(__dirname, '..', 'cypress', 'e2e');

// Patterns to fix
const fixes = [
  // Fix taskResult.data.user access
  {
    pattern: /taskResult\.data\.user/g,
    replacement: '(taskResult.data as TaskDataResult).user'
  },
  // Fix taskResult.data.forkUser access
  {
    pattern: /taskResult\.data\.forkUser/g,
    replacement: '(taskResult.data as TaskDataResult).forkUser'
  },
  // Fix taskResult.data.tempDir access
  {
    pattern: /taskResult\.data\.tempDir/g,
    replacement: '(taskResult.data as TaskDataResult).tempDir'
  },
  // Fix taskResult.data.mockResponses access
  {
    pattern: /taskResult\.data\.mockResponses/g,
    replacement: '(taskResult.data as TaskDataResult).mockResponses'
  },
  // Fix const taskResult = { data: {} } declarations
  {
    pattern: /const taskResult = \{ data: \{\} \}/g,
    replacement: 'const taskResult: { data: TaskDataResult } = { data: {} as TaskDataResult }'
  },
  // Fix let taskResult = { data: {} } declarations
  {
    pattern: /let taskResult = \{ data: \{\} \}/g,
    replacement: 'let taskResult: { data: TaskDataResult } = { data: {} as TaskDataResult }'
  },
  // Fix Cypress.mocha.getRunner().suite.ctx.currentTest access
  {
    pattern: /Cypress\.mocha\.getRunner\(\)\.suite\.ctx\.currentTest\.parent\.title/g,
    replacement: '(Cypress.mocha.getRunner().suite.ctx?.currentTest?.parent?.title || "")'
  },
  {
    pattern: /Cypress\.mocha\.getRunner\(\)\.suite\.ctx\.currentTest\.title/g,
    replacement: '(Cypress.mocha.getRunner().suite.ctx?.currentTest?.title || "")'
  },
  // Fix clock.tick() calls - add type assertion
  {
    pattern: /const clock = cy\.state\('clock'\);/g,
    replacement: 'const clock = cy.state(\'clock\') as Clock | undefined;'
  },
  // Fix currentWindow access
  {
    pattern: /const currentWindow = Cypress\.state\('window'\);/g,
    replacement: 'const currentWindow = Cypress.state(\'window\') as Window | undefined;'
  },
  // Fix login(undefined) to login()
  {
    pattern: /login\(undefined\)/g,
    replacement: 'login()'
  },
  // Fix flushClockAndSave(undefined) to flushClockAndSave()
  {
    pattern: /flushClockAndSave\(undefined\)/g,
    replacement: 'flushClockAndSave()'
  }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const fix of fixes) {
    if (fix.pattern.test(content)) {
      // Reset lastIndex for global patterns
      fix.pattern.lastIndex = 0;
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.ts')) {
      callback(filePath);
    }
  }
}

let fixedCount = 0;
walkDir(cypressE2eDir, (filePath) => {
  if (processFile(filePath)) {
    fixedCount++;
  }
});

console.log(`\nFixed ${fixedCount} files`);
