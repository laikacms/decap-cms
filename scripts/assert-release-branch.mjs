import { execFileSync } from 'node:child_process';

const expectedBranch = 'main';
const currentBranch = process.env.GITHUB_REF_NAME
  ?? execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();

if (currentBranch !== expectedBranch) {
  throw new Error(
    `Releases must be published from ${expectedBranch}; current branch is ${currentBranch || '(detached)'}`,
  );
}
