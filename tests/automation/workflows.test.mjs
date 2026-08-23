import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const auditWorkflowFile = new URL('../../.github/workflows/rules-audit.yml', import.meta.url);
const validateWorkflowFile = new URL('../../.github/workflows/validate-rules.yml', import.meta.url);
const validationScriptFile = new URL('../../scripts/validate-all.mjs', import.meta.url);

const [auditWorkflow, validateWorkflow, validationScript] = await Promise.all([
  readFile(auditWorkflowFile, 'utf8'),
  readFile(validateWorkflowFile, 'utf8'),
  readFile(validationScriptFile, 'utf8'),
]);

function occurrenceCount(content, value) {
  return content.split(value).length - 1;
}

test('both workflows use the single complete validation entry point', () => {
  const sharedCommand = 'run: node scripts/validate-all.mjs';
  assert.equal(occurrenceCount(auditWorkflow, sharedCommand), 1);
  assert.equal(occurrenceCount(validateWorkflow, sharedCommand), 1);

  for (const command of [
    "['scripts/generate-rules.mjs', '--check']",
    "['scripts/validate-rules.mjs']",
    "['--test', ...automationTests]",
    "['git', ['diff', '--check']]",
  ]) {
    assert(validationScript.includes(command));
  }

  for (const duplicatedCommand of [
    'node scripts/generate-rules.mjs --check',
    'node scripts/validate-rules.mjs',
    'node --test tests/automation/*.test.mjs',
    'git diff --check',
  ]) {
    assert(!auditWorkflow.includes(duplicatedCommand));
    assert(!validateWorkflow.includes(duplicatedCommand));
  }
});

test('audit dispatches validation against the pushed automation branch', () => {
  const push = 'git push --force-with-lease origin "HEAD:refs/heads/${AUDIT_BRANCH}"';
  const dispatch = 'gh workflow run validate-rules.yml --ref "${AUDIT_BRANCH}"';

  assert.match(auditWorkflow, /^  actions: write$/m);
  assert(auditWorkflow.includes('GH_TOKEN: ${{ github.token }}'));
  assert(auditWorkflow.includes('AUDIT_BRANCH: automation/rule-audit'));
  assert(auditWorkflow.includes(dispatch));
  assert(auditWorkflow.indexOf(push) < auditWorkflow.indexOf(dispatch));
});

test('audit retains its state-only write boundary and Draft PR behavior', () => {
  assert(auditWorkflow.includes('if [[ "${file}" != "automation/upstream-state.json" ]]'));
  assert(auditWorkflow.includes('git add -- automation/upstream-state.json'));
  assert.match(auditWorkflow, /gh pr create \\\n\s+--draft/);
  assert(!auditWorkflow.includes('gh pr merge'));
  assert.deepEqual(auditWorkflow.match(/gh pr ready[^\n]*/g), [
    'gh pr ready "${pr_number}" --undo',
  ]);
});
