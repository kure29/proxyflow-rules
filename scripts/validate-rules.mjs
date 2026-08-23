#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  buildGeneratedFiles,
  canonicalMatchers,
  canonicalRuleText,
  loadCanonicalServices,
  repositoryRoot,
  rulesDirectory,
  serviceNames,
  targets,
} from './generate-rules.mjs';
import {
  validateAuditState,
  validateUpstreamRegistry,
} from './audit-upstreams.mjs';

function fail(file, line, message) {
  const location = path.relative(repositoryRoot, file);
  throw new Error(`${location}:${line}: ${message}`);
}

function parseCanonicalLine(file, lineNumber, line) {
  const parts = line.split(',');
  if (parts.some((part) => part !== part.trim())) {
    fail(file, lineNumber, 'fields must not contain surrounding whitespace');
  }
  const [type, value, option] = parts;
  if (!canonicalMatchers.has(type)) fail(file, lineNumber, `unsupported matcher: ${type || '(empty)'}`);
  if (!value) fail(file, lineNumber, `${type} requires a value`);

  const isIp = type === 'IP-CIDR' || type === 'IP-CIDR6';
  if (isIp) {
    if (parts.length !== 3 || option !== 'no-resolve') {
      fail(file, lineNumber, `${type} must include exactly one no-resolve option`);
    }
  } else if (parts.length !== 2) {
    fail(file, lineNumber, `${type} must contain exactly two fields`);
  }

  return { type, value, noResolve: isIp };
}

function assertNoDuplicates(file, rules) {
  const seen = new Set();
  for (const rule of rules) {
    const identity = canonicalRuleText(rule);
    if (seen.has(identity)) fail(file, rule.line, `duplicate rule: ${identity}`);
    seen.add(identity);
  }
}

async function parseYaml(file) {
  const lines = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n').split('\n');
  const rules = [];
  let payloadSeen = false;

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (rawLine === 'payload:') {
      if (payloadSeen) fail(file, lineNumber, 'duplicate payload key');
      payloadSeen = true;
      continue;
    }
    if (!payloadSeen) fail(file, lineNumber, 'the only top-level key must be payload');
    if (!rawLine.startsWith('  - ') || rawLine.slice(4) !== rawLine.slice(4).trim()) {
      fail(file, lineNumber, 'payload entries must use exactly "  - RULE"');
    }
    rules.push({ ...parseCanonicalLine(file, lineNumber, rawLine.slice(4)), line: lineNumber });
  }

  if (!payloadSeen) fail(file, 1, 'missing payload key');
  if (rules.length === 0) fail(file, 1, 'payload must be a non-empty array');
  assertNoDuplicates(file, rules);
  return rules;
}

async function parseList(file) {
  const lines = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n').split('\n');
  const rules = [];
  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line !== rawLine) fail(file, lineNumber, 'rule lines must not have surrounding whitespace');
    rules.push({ ...parseCanonicalLine(file, lineNumber, line), line: lineNumber });
  }
  if (rules.length === 0) fail(file, 1, 'rule list must not be empty');
  assertNoDuplicates(file, rules);
  return rules;
}

const quantumultReverseType = new Map([
  ['HOST', 'DOMAIN'],
  ['HOST-SUFFIX', 'DOMAIN-SUFFIX'],
  ['HOST-KEYWORD', 'DOMAIN-KEYWORD'],
  ['IP-CIDR', 'IP-CIDR'],
  ['IP6-CIDR', 'IP-CIDR6'],
]);

async function parseQuantumultX(file, service) {
  const lines = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n').split('\n');
  const rules = [];
  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line !== rawLine) fail(file, lineNumber, 'rule lines must not have surrounding whitespace');
    const parts = line.split(',');
    if (parts.some((part) => part !== part.trim())) fail(file, lineNumber, 'fields must not contain surrounding whitespace');
    const [quantumultMatcher, value, policy, option] = parts;
    const type = quantumultReverseType.get(quantumultMatcher);
    if (!type) fail(file, lineNumber, `unsupported Quantumult X matcher: ${quantumultMatcher || '(empty)'}`);
    if (!value) fail(file, lineNumber, `${quantumultMatcher} requires a value`);
    if (policy !== service) fail(file, lineNumber, `policy placeholder must be ${service}`);
    const isIp = type === 'IP-CIDR' || type === 'IP-CIDR6';
    if (isIp) {
      if (parts.length !== 4 || option !== 'no-resolve') fail(file, lineNumber, `${quantumultMatcher} must end with ${service},no-resolve`);
    } else if (parts.length !== 3) {
      fail(file, lineNumber, `${quantumultMatcher} must contain matcher, value, and policy`);
    }
    rules.push({ type, value, noResolve: isIp, line: lineNumber });
  }
  if (rules.length === 0) fail(file, 1, 'rule list must not be empty');
  assertNoDuplicates(file, rules);
  return rules;
}

function semanticRules(rules) {
  return rules.map(({ type, value, noResolve }) => canonicalRuleText({ type, value, noResolve }));
}

function assertSameRules(file, actual, expected) {
  const actualRules = semanticRules(actual);
  const expectedRules = semanticRules(expected);
  if (JSON.stringify(actualRules) !== JSON.stringify(expectedRules)) {
    throw new Error(`${path.relative(repositoryRoot, file)}: semantic rules differ from canonical source`);
  }
}

const services = await loadCanonicalServices();
const generatedFiles = buildGeneratedFiles(services);
const parsedByTarget = new Map();

for (const service of services) {
  const grouped = service.rules.reduce((groups, rule) => {
    (groups[rule.classification] ??= []).push(rule);
    return groups;
  }, {});
  const summary = ['core', 'official-dependency', 'dedicated-infrastructure']
    .map((classification) => `${classification}=${grouped[classification]?.length ?? 0}`)
    .join(', ');
  console.log(`ok canonical ${service.service} (${service.rules.length} rules; ${summary})`);
}

for (const target of targets) {
  const directory = path.join(rulesDirectory, target.name);
  const files = (await readdir(directory)).sort((a, b) => a.localeCompare(b));
  const expectedFiles = serviceNames.map((service) => `${service}${target.extension}`).sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    throw new Error(`rules/${target.name} must contain exactly: ${expectedFiles.join(', ')}`);
  }

  const targetServices = new Map();
  let targetCount = 0;
  for (const service of services) {
    const file = path.join(directory, `${service.service}${target.extension}`);
    let parsed;
    if (target.format === 'yaml') parsed = await parseYaml(file);
    else if (target.format === 'quantumult-x') parsed = await parseQuantumultX(file, service.service);
    else parsed = await parseList(file);
    assertSameRules(file, parsed, service.rules);
    targetServices.set(service.service, semanticRules(parsed));
    targetCount += parsed.length;

    const expectedContent = generatedFiles.get(file);
    const actualContent = await readFile(file, 'utf8');
    if (actualContent !== expectedContent) {
      throw new Error(`${path.relative(repositoryRoot, file)}: generated file is stale`);
    }
  }
  parsedByTarget.set(target.name, targetServices);
  console.log(`ok ${target.name} (${files.length} files, ${targetCount} rules)`);
}

for (const service of serviceNames) {
  const mihomo = parsedByTarget.get('mihomo').get(service);
  const stash = parsedByTarget.get('stash').get(service);
  if (JSON.stringify(mihomo) !== JSON.stringify(stash)) throw new Error(`${service}: Mihomo and Stash payloads differ`);

  const surge = parsedByTarget.get('surge').get(service);
  for (const target of ['loon', 'shadowrocket']) {
    if (JSON.stringify(surge) !== JSON.stringify(parsedByTarget.get(target).get(service))) {
      throw new Error(`${service}: Surge, Loon, and Shadowrocket bodies differ`);
    }
  }
  if (JSON.stringify(mihomo) !== JSON.stringify(surge) || JSON.stringify(mihomo) !== JSON.stringify(parsedByTarget.get('quantumult-x').get(service))) {
    throw new Error(`${service}: client outputs are not semantically equivalent`);
  }
}

const rulesPerClient = services.reduce((sum, service) => sum + service.rules.length, 0);
const upstreamRegistryFile = path.join(repositoryRoot, 'sources', 'upstreams.json');
const auditStateFile = path.join(repositoryRoot, 'automation', 'upstream-state.json');
const upstreamRegistry = JSON.parse(await readFile(upstreamRegistryFile, 'utf8'));
const auditState = JSON.parse(await readFile(auditStateFile, 'utf8'));
validateUpstreamRegistry(upstreamRegistry, services);
validateAuditState(auditState, services);

console.log('ok semantic parity (all six clients)');
console.log('ok generated files are current');
console.log('ok automation registry and state metadata');
console.log(`Validated ${services.length} canonical services and ${generatedFiles.size} generated files (${rulesPerClient} rules per client).`);
