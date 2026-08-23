#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const automationTestDirectory = path.join(repositoryRoot, 'tests', 'automation');
const automationTests = (await readdir(automationTestDirectory))
  .filter((file) => file.endsWith('.test.mjs'))
  .sort()
  .map((file) => path.join('tests', 'automation', file));

if (automationTests.length === 0) {
  throw new Error('No automation tests found.');
}

const checks = [
  [process.execPath, ['scripts/generate-rules.mjs', '--check']],
  [process.execPath, ['scripts/validate-rules.mjs']],
  [process.execPath, ['--test', ...automationTests]],
  ['git', ['diff', '--check']],
];

for (const [command, argumentsList] of checks) {
  console.log(`\n> ${[command, ...argumentsList].join(' ')}`);
  const result = spawnSync(command, argumentsList, {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
