#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const serviceNames = [
  'OpenAI',
  'Claude',
  'Google',
  'Gemini',
  'YouTube',
  'Netflix',
  'Disney',
  'Telegram',
  'GitHub',
  'Steam',
];

export const canonicalMatchers = new Set([
  'DOMAIN',
  'DOMAIN-SUFFIX',
  'DOMAIN-KEYWORD',
  'IP-CIDR',
  'IP-CIDR6',
]);

export const classifications = new Set([
  'core',
  'official-dependency',
  'dedicated-infrastructure',
]);

export const sourceKinds = new Set([
  'official-documentation',
  'official-domain',
  'official-network-information',
  'independent-network-verification',
]);

export const targets = [
  { name: 'mihomo', label: 'Mihomo', extension: '.yaml', format: 'yaml' },
  { name: 'stash', label: 'Stash', extension: '.yaml', format: 'yaml' },
  { name: 'surge', label: 'Surge', extension: '.list', format: 'list' },
  { name: 'loon', label: 'Loon', extension: '.list', format: 'list' },
  { name: 'shadowrocket', label: 'Shadowrocket', extension: '.list', format: 'list' },
  { name: 'quantumult-x', label: 'Quantumult X', extension: '.list', format: 'quantumult-x' },
];

const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(scriptDirectory, '..');
export const sourcesDirectory = path.join(repositoryRoot, 'sources', 'services');
export const rulesDirectory = path.join(repositoryRoot, 'rules');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateDomain(value, type, location) {
  if (type === 'DOMAIN-KEYWORD') {
    assert(value.length > 0 && !/\s/.test(value), `${location}: invalid DOMAIN-KEYWORD value`);
    return;
  }
  assert(domainPattern.test(value), `${location}: invalid ${type} value: ${value}`);
}

function validateCidr(value, type, location) {
  const slash = value.lastIndexOf('/');
  assert(slash > 0 && slash < value.length - 1, `${location}: ${type} requires CIDR notation`);
  const address = value.slice(0, slash);
  const prefixText = value.slice(slash + 1);
  const expectedVersion = type === 'IP-CIDR' ? 4 : 6;
  const maximum = expectedVersion === 4 ? 32 : 128;
  assert(isIP(address) === expectedVersion, `${location}: invalid ${type} address: ${address}`);
  assert(/^\d+$/.test(prefixText), `${location}: invalid ${type} prefix: ${prefixText}`);
  const prefix = Number(prefixText);
  assert(prefix >= 0 && prefix <= maximum, `${location}: invalid ${type} prefix: ${prefixText}`);
}

function validateCanonicalDocument(file, document) {
  const location = path.relative(repositoryRoot, file);
  assert(document && typeof document === 'object' && !Array.isArray(document), `${location}: top level must be an object`);
  assert(serviceNames.includes(document.service), `${location}: unexpected service: ${document.service}`);
  assert(path.basename(file, '.json') === document.service, `${location}: filename must match service`);
  assert(Array.isArray(document.sources) && document.sources.length > 0, `${location}: sources must be a non-empty array`);
  assert(Array.isArray(document.rules) && document.rules.length > 0, `${location}: rules must be a non-empty array`);

  const sourceIds = new Set();
  for (const [index, source] of document.sources.entries()) {
    const sourceLocation = `${location}:sources[${index}]`;
    assert(source && typeof source === 'object' && !Array.isArray(source), `${sourceLocation}: source must be an object`);
    assert(typeof source.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id), `${sourceLocation}: invalid source id`);
    assert(!sourceIds.has(source.id), `${sourceLocation}: duplicate source id: ${source.id}`);
    assert(sourceKinds.has(source.kind), `${sourceLocation}: unsupported source kind: ${source.kind}`);
    assert(typeof source.url === 'string' && source.url.startsWith('https://'), `${sourceLocation}: source URL must use HTTPS`);
    assert(typeof source.description === 'string' && source.description.trim(), `${sourceLocation}: source description is required`);
    sourceIds.add(source.id);
  }

  const seenRules = new Set();
  for (const [index, rule] of document.rules.entries()) {
    const ruleLocation = `${location}:rules[${index}]`;
    assert(rule && typeof rule === 'object' && !Array.isArray(rule), `${ruleLocation}: rule must be an object`);
    assert(canonicalMatchers.has(rule.type), `${ruleLocation}: unsupported matcher: ${rule.type}`);
    assert(typeof rule.value === 'string' && rule.value === rule.value.trim() && rule.value === rule.value.toLowerCase(), `${ruleLocation}: value must be trimmed lowercase text`);
    assert(classifications.has(rule.classification), `${ruleLocation}: unsupported classification: ${rule.classification}`);
    assert(typeof rule.evidence === 'string' && rule.evidence.trim(), `${ruleLocation}: evidence is required`);
    assert(typeof rule.source === 'string' && sourceIds.has(rule.source), `${ruleLocation}: unknown source reference: ${rule.source}`);
    assert(rule.notes === undefined || (typeof rule.notes === 'string' && rule.notes.trim()), `${ruleLocation}: notes must be non-empty text when present`);

    if (rule.type.startsWith('IP-CIDR')) {
      validateCidr(rule.value, rule.type, ruleLocation);
      assert(rule.noResolve === true, `${ruleLocation}: IP rules must set noResolve to true`);
    } else {
      validateDomain(rule.value, rule.type, ruleLocation);
      assert(rule.noResolve === undefined, `${ruleLocation}: noResolve is only valid on IP rules`);
    }

    const identity = `${rule.type},${rule.value}`;
    assert(!seenRules.has(identity), `${ruleLocation}: duplicate rule: ${identity}`);
    seenRules.add(identity);
  }
}

export async function loadCanonicalServices() {
  const sourceFiles = (await readdir(sourcesDirectory)).sort((a, b) => a.localeCompare(b));
  const expectedFiles = serviceNames.map((service) => `${service}.json`).sort((a, b) => a.localeCompare(b));
  assert(JSON.stringify(sourceFiles) === JSON.stringify(expectedFiles), `sources/services must contain exactly: ${expectedFiles.join(', ')}`);

  const services = [];
  for (const service of serviceNames) {
    const file = path.join(sourcesDirectory, `${service}.json`);
    let document;
    try {
      document = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      throw new Error(`${path.relative(repositoryRoot, file)}: invalid JSON: ${error.message}`);
    }
    validateCanonicalDocument(file, document);
    services.push(document);
  }
  return services;
}

export function canonicalRuleText(rule) {
  return `${rule.type},${rule.value}${rule.noResolve ? ',no-resolve' : ''}`;
}

function header(service, target) {
  return [
    '# ProxyFlow generated rule set',
    `# Service: ${service}`,
    `# Target: ${target}`,
    '#',
    '# DO NOT EDIT.',
    `# Source: sources/services/${service}.json`,
    '',
  ];
}

function renderYaml(service, target) {
  return [
    ...header(service.service, target.label),
    'payload:',
    ...service.rules.map((rule) => `  - ${canonicalRuleText(rule)}`),
    '',
  ].join('\n');
}

function renderList(service, target) {
  return [
    ...header(service.service, target.label),
    ...service.rules.map(canonicalRuleText),
    '',
  ].join('\n');
}

const quantumultType = new Map([
  ['DOMAIN', 'HOST'],
  ['DOMAIN-SUFFIX', 'HOST-SUFFIX'],
  ['DOMAIN-KEYWORD', 'HOST-KEYWORD'],
  ['IP-CIDR', 'IP-CIDR'],
  ['IP-CIDR6', 'IP6-CIDR'],
]);

function renderQuantumultX(service, target) {
  return [
    ...header(service.service, target.label),
    ...service.rules.map((rule) => `${quantumultType.get(rule.type)},${rule.value},${service.service}${rule.noResolve ? ',no-resolve' : ''}`),
    '',
  ].join('\n');
}

export function buildGeneratedFiles(services) {
  const files = new Map();
  for (const target of targets) {
    for (const service of services) {
      let content;
      if (target.format === 'yaml') content = renderYaml(service, target);
      else if (target.format === 'list') content = renderList(service, target);
      else content = renderQuantumultX(service, target);
      files.set(path.join(rulesDirectory, target.name, `${service.service}${target.extension}`), content);
    }
  }
  return files;
}

async function findUnexpectedGeneratedFiles() {
  const unexpected = [];
  for (const target of targets) {
    const directory = path.join(rulesDirectory, target.name);
    const actual = (await readdir(directory)).sort((a, b) => a.localeCompare(b));
    const expected = serviceNames.map((service) => `${service}${target.extension}`).sort((a, b) => a.localeCompare(b));
    for (const file of actual) {
      if (!expected.includes(file)) unexpected.push(path.join(directory, file));
    }
  }
  return unexpected;
}

async function generate(checkOnly) {
  const services = await loadCanonicalServices();
  const files = buildGeneratedFiles(services);

  if (checkOnly) {
    const errors = [];
    for (const [file, expected] of files) {
      let actual;
      try {
        actual = await readFile(file, 'utf8');
      } catch {
        errors.push(`missing ${path.relative(repositoryRoot, file)}`);
        continue;
      }
      if (actual !== expected) errors.push(`stale ${path.relative(repositoryRoot, file)}`);
    }
    for (const file of await findUnexpectedGeneratedFiles()) {
      errors.push(`unexpected ${path.relative(repositoryRoot, file)}`);
    }
    assert(errors.length === 0, `Generated rules are not current:\n${errors.join('\n')}`);
  } else {
    for (const target of targets) {
      await mkdir(path.join(rulesDirectory, target.name), { recursive: true });
    }
    for (const [file, content] of files) {
      await writeFile(file, content, 'utf8');
    }
  }

  const ruleCount = services.reduce((sum, service) => sum + service.rules.length, 0);
  console.log(`${checkOnly ? 'Checked' : 'Generated'} ${files.size} files from ${services.length} canonical services (${ruleCount} rules per client).`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argumentsList = process.argv.slice(2);
  assert(argumentsList.length <= 1 && (argumentsList.length === 0 || argumentsList[0] === '--check'), 'Usage: node scripts/generate-rules.mjs [--check]');
  await generate(argumentsList[0] === '--check');
}
