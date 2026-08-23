#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const supportedMatchers = new Set([
  'DOMAIN',
  'DOMAIN-SUFFIX',
  'DOMAIN-KEYWORD',
  'IP-CIDR',
  'IP-CIDR6',
]);

const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rulesDirectory = path.resolve(scriptDirectory, '..', 'rules', 'mihomo');

function fail(file, line, message) {
  throw new Error(`${file}:${line}: ${message}`);
}

function validateDomain(file, line, matcher, value) {
  if (matcher === 'DOMAIN-KEYWORD') {
    if (!value || /\s/.test(value)) {
      fail(file, line, 'DOMAIN-KEYWORD requires one non-whitespace value');
    }
    return;
  }

  if (!domainPattern.test(value)) {
    fail(file, line, `${matcher} has an invalid domain: ${value}`);
  }
}

function validateCidr(file, line, matcher, value) {
  const slash = value.lastIndexOf('/');
  if (slash <= 0 || slash === value.length - 1) {
    fail(file, line, `${matcher} requires CIDR notation`);
  }

  const address = value.slice(0, slash);
  const prefixText = value.slice(slash + 1);
  const expectedVersion = matcher === 'IP-CIDR' ? 4 : 6;
  const maxPrefix = expectedVersion === 4 ? 32 : 128;
  const prefix = Number(prefixText);

  if (isIP(address) !== expectedVersion) {
    fail(file, line, `${matcher} has an invalid IP address: ${address}`);
  }

  if (!/^\d+$/.test(prefixText) || prefix < 0 || prefix > maxPrefix) {
    fail(file, line, `${matcher} has an invalid prefix: ${prefixText}`);
  }
}

function validateRule(file, line, rule) {
  const parts = rule.split(',').map((part) => part.trim());
  const [matcher, value, option] = parts;

  if (!supportedMatchers.has(matcher)) {
    fail(file, line, `unsupported matcher: ${matcher || '(empty)'}`);
  }

  if (!value) {
    fail(file, line, `${matcher} requires a value`);
  }

  if (matcher.startsWith('IP-CIDR')) {
    if (parts.length > 3 || (parts.length === 3 && option !== 'no-resolve')) {
      fail(file, line, `${matcher} only supports the optional no-resolve flag`);
    }
    validateCidr(file, line, matcher, value);
    return;
  }

  if (parts.length !== 2) {
    fail(file, line, `${matcher} must contain exactly two comma-separated fields`);
  }
  validateDomain(file, line, matcher, value);
}

async function validateFile(file) {
  const source = await readFile(path.join(rulesDirectory, file), 'utf8');
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  const rules = [];
  const seen = new Set();
  let payloadSeen = false;

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (rawLine === 'payload:') {
      if (payloadSeen) {
        fail(file, lineNumber, 'duplicate payload key');
      }
      payloadSeen = true;
      continue;
    }

    if (!payloadSeen) {
      fail(file, lineNumber, 'the only top-level key must be payload');
    }

    if (!rawLine.startsWith('  - ') || rawLine.slice(4) !== rawLine.slice(4).trim()) {
      fail(file, lineNumber, 'payload entries must use exactly "  - RULE"');
    }

    const rule = rawLine.slice(4);
    validateRule(file, lineNumber, rule);

    if (seen.has(rule)) {
      fail(file, lineNumber, `duplicate rule: ${rule}`);
    }
    seen.add(rule);
    rules.push(rule);
  }

  if (!payloadSeen) {
    fail(file, 1, 'missing payload key');
  }
  if (rules.length === 0) {
    fail(file, 1, 'payload must be a non-empty array');
  }

  return rules.length;
}

const files = (await readdir(rulesDirectory))
  .filter((file) => file.endsWith('.yaml'))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  throw new Error('No rules/mihomo/*.yaml files found');
}

let total = 0;
for (const file of files) {
  const count = await validateFile(file);
  total += count;
  console.log(`ok ${file} (${count} rules)`);
}

console.log(`Validated ${files.length} files and ${total} rules.`);
