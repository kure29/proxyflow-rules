#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalRuleText,
  loadCanonicalServices,
  repositoryRoot,
} from './generate-rules.mjs';

const upstreamsFile = path.join(repositoryRoot, 'sources', 'upstreams.json');
const defaultOutputFile = path.join(repositoryRoot, 'automation', 'upstream-state.json');
const communityMatchers = new Set([
  'DOMAIN',
  'DOMAIN-SUFFIX',
  'DOMAIN-KEYWORD',
  'IP-CIDR',
  'IP-CIDR6',
]);
const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const hashPattern = /^sha256:[a-f0-9]{64}$/;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const userAgent = 'ProxyFlow-Rules-Audit/1.0 (+https://github.com/kure29/proxyflow-rules)';

export class AuditError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AuditError';
    this.status = status;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertExactKeys(value, expected, location) {
  const actual = Object.keys(value).sort(compareText);
  const sortedExpected = [...expected].sort(compareText);
  assert(JSON.stringify(actual) === JSON.stringify(sortedExpected), `${location}: expected only ${sortedExpected.join(', ')}`);
}

export function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function contentBytes(content) {
  if (typeof content === 'string') return Buffer.from(content, 'utf8');
  if (content instanceof Uint8Array) return content;
  if (content && typeof content === 'object' && 'body' in content) return contentBytes(content.body);
  throw new AuditError('PARSE_FAILED', 'response body must be text or bytes');
}

function contentText(content) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(contentBytes(content));
  } catch (error) {
    if (error instanceof AuditError) throw error;
    throw new AuditError('PARSE_FAILED', `response is not valid UTF-8: ${error.message}`);
  }
}

function normalizedJson(value) {
  if (Array.isArray(value)) return value.map(normalizedJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort(compareText).map((key) => [key, normalizedJson(value[key])]),
    );
  }
  return value;
}

function normalizedHtml(content) {
  return content
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style|template|svg)\b[^]*?<\/\1\s*>/gi, ' ')
    .replace(/<!doctype[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function officialContentFingerprint(content) {
  const bytes = contentBytes(content);
  const contentType = content && typeof content === 'object' && 'contentType' in content
    ? String(content.contentType).toLowerCase()
    : '';
  const entityTag = content && typeof content === 'object' && 'entityTag' in content
    ? content.entityTag
    : null;
  const lastModified = content && typeof content === 'object' && 'lastModified' in content
    ? content.lastModified
    : null;
  if (entityTag) {
    const trimmedEntityTag = entityTag.trim();
    return {
      hash: sha256(`etag:${trimmedEntityTag.replace(/^W\//, '')}`),
      basis: trimmedEntityTag.startsWith('W/') ? 'weak-etag' : 'strong-etag',
    };
  }
  if (lastModified) {
    return { hash: sha256(`last-modified:${lastModified}`), basis: 'last-modified' };
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { hash: sha256(bytes), basis: 'binary' };
  }
  const trimmed = text.trimStart();

  if (contentType.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return { hash: sha256(JSON.stringify(normalizedJson(JSON.parse(text)))), basis: 'json' };
    } catch {
      // A mislabeled response still receives a deterministic text fingerprint.
    }
  }
  if (contentType.includes('html') || /^<!doctype\s+html|^<html\b/i.test(trimmed)) {
    return { hash: sha256(normalizedHtml(text)), basis: 'html' };
  }
  if (contentType.startsWith('text/') || contentType === '') {
    const normalizedText = text
      .replaceAll('\r\n', '\n')
      .replaceAll('\r', '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trimEnd();
    return { hash: sha256(normalizedText), basis: 'text' };
  }
  return { hash: sha256(bytes), basis: 'binary' };
}

export function officialContentHash(content) {
  return officialContentFingerprint(content).hash;
}

function normalizeCidr(value, type) {
  const slash = value.lastIndexOf('/');
  if (slash <= 0 || slash === value.length - 1) return null;
  const address = value.slice(0, slash).toLowerCase();
  const prefixText = value.slice(slash + 1);
  const expectedVersion = type === 'IP-CIDR' ? 4 : 6;
  const maximum = expectedVersion === 4 ? 32 : 128;
  if (isIP(address) !== expectedVersion || !/^\d+$/.test(prefixText)) return null;
  const prefix = Number(prefixText);
  if (prefix < 0 || prefix > maximum) return null;
  return `${address}/${prefix}`;
}

function invalidRule(line, reason) {
  return { line, reason };
}

export function parseCommunityList(content, location = 'community feed') {
  const lines = contentText(content).replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const candidates = [];
  const invalidRules = [];
  const significantLines = [];
  const unsupported = new Map();
  const seen = new Set();
  let duplicates = 0;

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = (index === 0 ? rawLine.replace(/^\uFEFF/, '') : rawLine).trim();
    if (!line || line.startsWith('#')) continue;

    const fields = line.split(',').map((field) => field.trim());
    const type = fields[0].toUpperCase();
    const sourceLineIndex = significantLines.push([type, ...fields.slice(1)].join(',')) - 1;

    if (!communityMatchers.has(type)) {
      unsupported.set(type || '(empty)', (unsupported.get(type || '(empty)') ?? 0) + 1);
      continue;
    }

    if (fields.length < 2 || !fields[1]) {
      invalidRules.push(invalidRule(lineNumber, `${type} requires a value`));
      continue;
    }

    const isIp = type === 'IP-CIDR' || type === 'IP-CIDR6';
    let value = fields[1].toLowerCase();
    let noResolve = false;

    if (isIp) {
      if (fields.length > 3 || (fields.length === 3 && fields[2].toLowerCase() !== 'no-resolve')) {
        invalidRules.push(invalidRule(lineNumber, `${type} only supports the optional no-resolve flag`));
        continue;
      }
      value = normalizeCidr(value, type);
      if (!value) {
        invalidRules.push(invalidRule(lineNumber, `${type} has an invalid CIDR value`));
        continue;
      }
      noResolve = fields.length === 3;
    } else {
      if (fields.length !== 2) {
        invalidRules.push(invalidRule(lineNumber, `${type} must contain exactly two fields`));
        continue;
      }
      const validValue = type === 'DOMAIN-KEYWORD'
        ? value.length > 0 && !/\s/.test(value)
        : domainPattern.test(value);
      if (!validValue) {
        invalidRules.push(invalidRule(lineNumber, `${type} has an invalid value`));
        continue;
      }
    }

    const candidate = { type, value, noResolve };
    const identity = canonicalRuleText(candidate);
    significantLines[sourceLineIndex] = identity;
    if (seen.has(identity)) {
      duplicates += 1;
      continue;
    }
    seen.add(identity);
    candidates.push(candidate);
  }

  if (significantLines.length === 0) {
    throw new AuditError('PARSE_FAILED', `${location}: feed contains no rule lines`);
  }
  if (candidates.length === 0) {
    throw new AuditError('PARSE_FAILED', `${location}: feed contains no valid supported candidates`);
  }

  const unsupportedTypes = [...unsupported]
    .sort(([left], [right]) => compareText(left, right))
    .map(([type, count]) => ({ type, count }));
  const normalizedSource = significantLines.sort(compareText).join('\n');

  return {
    candidates,
    candidateHashes: candidates.map((candidate) => sha256(canonicalRuleText(candidate))).sort(compareText),
    sourceHash: sha256(normalizedSource),
    unsupportedTypes,
    duplicates,
    invalidRules,
  };
}

export function compareCandidateRules(candidates, canonicalRules, previousHashes = null) {
  const candidateIdentities = new Map(
    candidates.map((candidate) => [canonicalRuleText(candidate), candidate]),
  );
  const canonicalIdentities = new Set(canonicalRules.map(canonicalRuleText));
  const acceptedOverlap = [...candidateIdentities.keys()]
    .filter((identity) => canonicalIdentities.has(identity))
    .sort(compareText);
  const communityOnly = [...candidateIdentities.keys()]
    .filter((identity) => !canonicalIdentities.has(identity))
    .sort(compareText);
  const canonicalOnly = [...canonicalIdentities]
    .filter((identity) => !candidateIdentities.has(identity))
    .sort(compareText);
  const currentHashes = [...candidateIdentities.keys()].map(sha256).sort(compareText);

  let addedCandidateCount = null;
  let removedCandidateCount = null;
  if (previousHashes) {
    const previous = new Set(previousHashes);
    const current = new Set(currentHashes);
    addedCandidateCount = currentHashes.filter((hash) => !previous.has(hash)).length;
    removedCandidateCount = previousHashes.filter((hash) => !current.has(hash)).length;
  }

  return {
    acceptedOverlap,
    communityOnly,
    canonicalOnly,
    currentHashes,
    addedCandidateCount,
    removedCandidateCount,
  };
}

function validatedHttpsUrl(value, location) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new AuditError('FETCH_FAILED', `${location}: invalid URL`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) {
    throw new AuditError('FETCH_FAILED', `${location}: URL must be credential-free HTTPS`);
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || isIP(hostname) !== 0) {
    throw new AuditError('FETCH_FAILED', `${location}: literal IP and localhost URLs are not allowed`);
  }
  return url;
}

export async function fetchHttps(value, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maximumBytes = options.maximumBytes ?? 4 * 1024 * 1024;
  const maximumRedirects = options.maximumRedirects ?? 5;
  let current = validatedHttpsUrl(value, value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let redirects = 0; redirects <= maximumRedirects; redirects += 1) {
      let response;
      try {
        response = await fetch(current, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept: 'text/plain, application/json, text/html, */*;q=0.1',
            'User-Agent': userAgent,
          },
        });
      } catch (error) {
        const reason = controller.signal.aborted ? `timed out after ${timeoutMs}ms` : error.message;
        throw new AuditError('FETCH_FAILED', `${current.href}: ${reason}`);
      }

      if (redirectStatuses.has(response.status)) {
        if (redirects === maximumRedirects) {
          throw new AuditError('FETCH_FAILED', `${current.href}: too many redirects`);
        }
        const location = response.headers.get('location');
        if (!location) throw new AuditError('HTTP_ERROR', `${current.href}: redirect has no Location header`);
        await response.body?.cancel();
        current = validatedHttpsUrl(new URL(location, current).href, `${current.href} redirect`);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new AuditError('HTTP_ERROR', `${current.href}: HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maximumBytes) {
        await response.body?.cancel();
        throw new AuditError('OVERSIZE', `${current.href}: response exceeds ${maximumBytes} bytes`);
      }
      if (!response.body) {
        return {
          body: new Uint8Array(),
          contentType: response.headers.get('content-type') ?? '',
          entityTag: response.headers.get('etag'),
          lastModified: response.headers.get('last-modified'),
        };
      }

      try {
        const reader = response.body.getReader();
        const chunks = [];
        let length = 0;
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          length += chunk.byteLength;
          if (length > maximumBytes) {
            await reader.cancel();
            throw new AuditError('OVERSIZE', `${current.href}: response exceeds ${maximumBytes} bytes`);
          }
          chunks.push(chunk);
        }

        const body = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          body.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return {
          body,
          contentType: response.headers.get('content-type') ?? '',
          entityTag: response.headers.get('etag'),
          lastModified: response.headers.get('last-modified'),
        };
      } catch (error) {
        if (error instanceof AuditError) throw error;
        const reason = controller.signal.aborted ? `timed out after ${timeoutMs}ms` : error.message;
        throw new AuditError('FETCH_FAILED', `${current.href}: ${reason}`);
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  throw new AuditError('FETCH_FAILED', `${value}: redirect handling failed`);
}

export function validateUpstreamRegistry(registry, services) {
  assert(registry && typeof registry === 'object' && !Array.isArray(registry), 'sources/upstreams.json: top level must be an object');
  assertExactKeys(registry, ['schemaVersion', 'community'], 'sources/upstreams.json');
  assert(registry.schemaVersion === 1, 'sources/upstreams.json: schemaVersion must be 1');
  const community = registry.community;
  assert(community && typeof community === 'object' && !Array.isArray(community), 'sources/upstreams.json: community is required');
  assertExactKeys(community, ['id', 'role', 'repository', 'license', 'format', 'feeds'], 'sources/upstreams.json: community');
  assert(typeof community.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(community.id), 'sources/upstreams.json: community id is invalid');
  assert(community.role === 'community-candidate-index', 'sources/upstreams.json: community role must be community-candidate-index');
  assert(community.license === 'GPL-2.0', 'sources/upstreams.json: community license must be GPL-2.0');
  assert(community.format === 'surge-typed-list', 'sources/upstreams.json: unsupported community format');
  validatedHttpsUrl(community.repository, 'sources/upstreams.json: community repository');
  assert(Array.isArray(community.feeds), 'sources/upstreams.json: community feeds must be an array');

  const expectedNames = services.map((service) => service.service).sort(compareText);
  const actualNames = community.feeds.map((feed) => feed.service).sort(compareText);
  assert(JSON.stringify(actualNames) === JSON.stringify(expectedNames), 'sources/upstreams.json: community feeds must cover each canonical service exactly once');

  for (const feed of community.feeds) {
    assert(feed && typeof feed === 'object' && !Array.isArray(feed), 'sources/upstreams.json: each feed must be an object');
    assert(feed.status === 'available' || feed.status === 'unavailable', `sources/upstreams.json: ${feed.service} has an invalid status`);
    if (feed.status === 'available') {
      assertExactKeys(feed, ['service', 'status', 'url'], `sources/upstreams.json: ${feed.service}`);
      validatedHttpsUrl(feed.url, `sources/upstreams.json: ${feed.service}`);
    } else {
      assertExactKeys(feed, ['service', 'status'], `sources/upstreams.json: ${feed.service}`);
    }
  }
  return registry;
}

export function validateAuditState(state, services) {
  if (state === null) return;
  assert(state && typeof state === 'object' && !Array.isArray(state), 'audit state: top level must be an object');
  assertExactKeys(state, ['schemaVersion', 'services'], 'audit state');
  assert(state.schemaVersion === 1, 'audit state: schemaVersion must be 1');
  assert(state.services && typeof state.services === 'object' && !Array.isArray(state.services), 'audit state: services must be an object');
  const expectedNames = services.map((service) => service.service).sort(compareText);
  const actualNames = Object.keys(state.services).sort(compareText);
  assert(JSON.stringify(actualNames) === JSON.stringify(expectedNames), 'audit state: services must match the canonical catalog');

  for (const service of services) {
    const serviceState = state.services[service.service];
    assert(serviceState && typeof serviceState === 'object' && !Array.isArray(serviceState), `audit state: ${service.service} must be an object`);
    assertExactKeys(serviceState, serviceState.community === undefined ? ['official'] : ['community', 'official'], `audit state: ${service.service}`);
    assert(serviceState.official && typeof serviceState.official === 'object' && !Array.isArray(serviceState.official), `audit state: ${service.service}.official must be an object`);
    if (serviceState.community !== undefined) {
      const community = serviceState.community;
      assert(community && typeof community === 'object' && !Array.isArray(community), `audit state: ${service.service}.community must be an object`);
      assertExactKeys(community, ['sourceHash', 'candidateCount', 'candidateHashes'], `audit state: ${service.service}.community`);
      assert(hashPattern.test(community.sourceHash), `audit state: ${service.service}.community.sourceHash is invalid`);
      assert(Number.isInteger(community.candidateCount) && community.candidateCount >= 0, `audit state: ${service.service}.community.candidateCount is invalid`);
      assert(Array.isArray(community.candidateHashes), `audit state: ${service.service}.community.candidateHashes must be an array`);
      assert(community.candidateHashes.length === community.candidateCount, `audit state: ${service.service}.community candidate count does not match hashes`);
      assert(community.candidateHashes.every((hash) => hashPattern.test(hash)), `audit state: ${service.service}.community contains an invalid candidate hash`);
      assert(JSON.stringify(community.candidateHashes) === JSON.stringify([...new Set(community.candidateHashes)].sort(compareText)), `audit state: ${service.service}.community candidate hashes must be unique and sorted`);
    }
    const expectedOfficialIds = new Set(officialSources(service).map((source) => source.id));
    for (const [sourceId, contentHash] of Object.entries(serviceState.official)) {
      assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sourceId), `audit state: ${service.service} has an invalid official source id`);
      assert(expectedOfficialIds.has(sourceId), `audit state: ${service.service} has an unknown official source id: ${sourceId}`);
      assert(hashPattern.test(contentHash), `audit state: ${service.service}.${sourceId} has an invalid official content hash`);
    }
  }
}

function stableFailure(error, fallbackStatus) {
  if (error instanceof AuditError) return { status: error.status, error: error.message };
  return { status: fallbackStatus, error: error instanceof Error ? error.message : String(error) };
}

function officialSources(service) {
  return service.sources.filter((source) => source.kind.startsWith('official-'));
}

export async function auditSources({
  services,
  registry,
  previousState = null,
  initialize = false,
  fetchContent = fetchHttps,
}) {
  validateUpstreamRegistry(registry, services);
  validateAuditState(previousState, services);
  const feeds = new Map(registry.community.feeds.map((feed) => [feed.service, feed]));
  const fetchCache = new Map();
  const cachedFetch = (url) => {
    if (!fetchCache.has(url)) fetchCache.set(url, Promise.resolve().then(() => fetchContent(url)));
    return fetchCache.get(url);
  };

  const communityOutcomes = new Map(await Promise.all(services.map(async (service) => {
    const feed = feeds.get(service.service);
    if (feed.status === 'unavailable') return [service.service, { unavailable: true }];
    try {
      const content = await cachedFetch(feed.url);
      return [service.service, { parsed: parseCommunityList(content, feed.url) }];
    } catch (error) {
      return [service.service, { failure: stableFailure(error, 'FETCH_FAILED') }];
    }
  })));

  const officialOutcomes = new Map(await Promise.all(services.flatMap((service) => (
    officialSources(service).map(async (source) => {
      try {
        const content = await cachedFetch(source.url);
        const fingerprint = officialContentFingerprint(content);
        if (fingerprint.basis !== 'strong-etag') {
          const confirmation = officialContentFingerprint(await fetchContent(source.url));
          if (confirmation.hash !== fingerprint.hash) {
            throw new AuditError(
              'UNSTABLE_CONTENT',
              `${source.url}: repeated fetches produced different content fingerprints`,
            );
          }
        }
        return [`${service.service}\0${source.id}`, {
          contentHash: fingerprint.hash,
          fingerprintBasis: fingerprint.basis,
        }];
      } catch (error) {
        return [`${service.service}\0${source.id}`, { failure: stableFailure(error, 'FETCH_FAILED') }];
      }
    })
  ))));

  const nextState = { schemaVersion: 1, services: {} };
  const report = { initialized: initialize, changed: false, services: [] };

  for (const service of services) {
    const previousService = previousState?.services[service.service] ?? { official: {} };
    const nextService = { official: {} };
    const feed = feeds.get(service.service);
    const communityOutcome = communityOutcomes.get(service.service);
    let communityReport;

    if (communityOutcome.unavailable) {
      communityReport = {
        source: registry.community.id,
        feed: null,
        format: registry.community.format,
        status: 'UNAVAILABLE',
        previousCount: previousService.community?.candidateCount ?? null,
        currentCount: null,
        addedCandidateCount: null,
        removedCandidateCount: null,
        acceptedOverlap: null,
        communityOnly: null,
        canonicalOnly: null,
        unsupportedTypes: [],
        duplicates: null,
        invalidRules: null,
      };
    } else if (communityOutcome.failure) {
      if (previousService.community) nextService.community = structuredClone(previousService.community);
      communityReport = {
        source: registry.community.id,
        feed: feed.url,
        format: registry.community.format,
        ...communityOutcome.failure,
        previousCount: previousService.community?.candidateCount ?? null,
        currentCount: null,
        addedCandidateCount: null,
        removedCandidateCount: null,
        acceptedOverlap: null,
        communityOnly: null,
        canonicalOnly: null,
        unsupportedTypes: [],
        duplicates: null,
        invalidRules: null,
      };
    } else {
      const parsed = communityOutcome.parsed;
      const comparison = compareCandidateRules(
        parsed.candidates,
        service.rules,
        previousService.community?.candidateHashes ?? null,
      );
      nextService.community = {
        sourceHash: parsed.sourceHash,
        candidateCount: parsed.candidateHashes.length,
        candidateHashes: parsed.candidateHashes,
      };
      const communityChanged = previousService.community
        ? JSON.stringify(previousService.community) !== JSON.stringify(nextService.community)
        : !initialize;
      if (communityChanged) report.changed = true;
      communityReport = {
        source: registry.community.id,
        feed: feed.url,
        format: registry.community.format,
        status: initialize ? 'INITIALIZED' : communityChanged ? 'CHANGED' : 'UNCHANGED',
        previousCount: previousService.community?.candidateCount ?? null,
        currentCount: parsed.candidateHashes.length,
        addedCandidateCount: initialize ? 0 : comparison.addedCandidateCount,
        removedCandidateCount: initialize ? 0 : comparison.removedCandidateCount,
        acceptedOverlap: comparison.acceptedOverlap.length,
        communityOnly: comparison.communityOnly.length,
        canonicalOnly: comparison.canonicalOnly.length,
        unsupportedTypes: parsed.unsupportedTypes,
        duplicates: parsed.duplicates,
        invalidRules: parsed.invalidRules.length,
        details: {
          acceptedOverlap: comparison.acceptedOverlap,
          communityOnly: comparison.communityOnly,
          canonicalOnly: comparison.canonicalOnly,
          invalidRules: parsed.invalidRules,
        },
      };
    }

    const officialReport = [];
    for (const source of officialSources(service)) {
      const outcome = officialOutcomes.get(`${service.service}\0${source.id}`);
      const previousHash = previousService.official[source.id] ?? null;
      if (outcome.failure) {
        if (previousHash) nextService.official[source.id] = previousHash;
        officialReport.push({ id: source.id, url: source.url, ...outcome.failure });
        continue;
      }
      nextService.official[source.id] = outcome.contentHash;
      const changed = previousHash ? previousHash !== outcome.contentHash : !initialize;
      if (changed) report.changed = true;
      officialReport.push({
        id: source.id,
        url: source.url,
        fingerprintBasis: outcome.fingerprintBasis,
        status: initialize ? 'INITIALIZED' : changed ? 'CHANGED' : 'UNCHANGED',
      });
    }

    nextState.services[service.service] = nextService;
    report.services.push({ service: service.service, community: communityReport, official: officialReport });
  }

  if (!initialize && previousState && JSON.stringify(previousState) !== JSON.stringify(nextState)) {
    report.changed = true;
  }
  return { state: nextState, report };
}

function displayCount(value) {
  return value === null ? '-' : String(value);
}

function unsupportedText(types) {
  return types.length === 0 ? '-' : types.map(({ type, count }) => `${type}:${count}`).join(', ');
}

function escapeTable(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function renderSummary(report) {
  const lines = [
    '# Rules upstream audit',
    '',
    'Community feeds are candidate discovery sources only. Every accepted rule still requires independent evidence and manual review.',
    '',
    '| Service | Source | Status | Previous count | Current count | Added candidate count | Removed candidate count | Canonical overlap | Official changed / unreachable / unstable | Unsupported | Duplicates | Invalid |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: |',
  ];

  for (const service of report.services) {
    const community = service.community;
    const changed = service.official.filter((source) => source.status === 'CHANGED').map((source) => source.id);
    const unreachableStatuses = new Set(['FETCH_FAILED', 'HTTP_ERROR', 'OVERSIZE']);
    const unreachable = service.official
      .filter((source) => unreachableStatuses.has(source.status))
      .map((source) => `${source.id} (${source.status})`);
    const unstable = service.official
      .filter((source) => !['INITIALIZED', 'CHANGED', 'UNCHANGED'].includes(source.status) && !unreachableStatuses.has(source.status))
      .map((source) => `${source.id} (${source.status})`);
    const official = [
      changed.length > 0 ? `changed: ${changed.join(', ')}` : null,
      unreachable.length > 0 ? `unreachable: ${unreachable.join(', ')}` : null,
      unstable.length > 0 ? `unstable: ${unstable.join(', ')}` : null,
    ].filter(Boolean).join('; ') || '-';
    const source = community.feed
      ? `[${community.source}](${community.feed})`
      : community.source;
    lines.push(`| ${escapeTable(service.service)} | ${source} | ${community.status} | ${displayCount(community.previousCount)} | ${displayCount(community.currentCount)} | ${displayCount(community.addedCandidateCount)} | ${displayCount(community.removedCandidateCount)} | ${displayCount(community.acceptedOverlap)} | ${escapeTable(official)} | ${escapeTable(unsupportedText(community.unsupportedTypes))} | ${displayCount(community.duplicates)} | ${displayCount(community.invalidRules)} |`);
  }

  lines.push(
    '',
    '`communityOnly` is not accepted automatically. `canonicalOnly` is not removed automatically. Official changes only request manual evidence review.',
    '',
  );
  return lines.join('\n');
}

export function printReport(report, details = false) {
  for (const service of report.services) {
    const community = service.community;
    console.log([
      service.service,
      `community=${community.status}`,
      `previous=${displayCount(community.previousCount)}`,
      `current=${displayCount(community.currentCount)}`,
      `added=${displayCount(community.addedCandidateCount)}`,
      `removed=${displayCount(community.removedCandidateCount)}`,
      `overlap=${displayCount(community.acceptedOverlap)}`,
      `communityOnly=${displayCount(community.communityOnly)}`,
      `canonicalOnly=${displayCount(community.canonicalOnly)}`,
      `unsupported=${unsupportedText(community.unsupportedTypes)}`,
      `duplicates=${displayCount(community.duplicates)}`,
      `invalid=${displayCount(community.invalidRules)}`,
    ].join(' '));
    if (community.error) console.log(`  ${community.status}: ${community.error}`);
    for (const source of service.official) {
      console.log(`  official ${source.id}=${source.status}${source.fingerprintBasis ? ` basis=${source.fingerprintBasis}` : ''}${source.error ? ` (${source.error})` : ''}`);
    }
    if (details && community.details) {
      for (const key of ['acceptedOverlap', 'communityOnly', 'canonicalOnly']) {
        console.log(`  ${key}:`);
        for (const rule of community.details[key]) console.log(`    ${rule}`);
      }
      if (community.details.invalidRules.length > 0) {
        console.log('  invalidRules:');
        for (const invalid of community.details.invalidRules) console.log(`    line ${invalid.line}: ${invalid.reason}`);
      }
    }
  }
  console.log(`Audit result: ${report.changed ? 'upstream changes detected' : report.initialized ? 'baseline initialized' : 'no upstream changes'}.`);
}

function parseArguments(argumentsList) {
  const options = {
    dryRun: false,
    details: false,
    initialize: false,
    output: defaultOutputFile,
    summary: null,
  };
  const valueOptions = new Map([
    ['--output', 'output'],
    ['--summary', 'summary'],
  ]);
  const booleanOptions = new Map([
    ['--dry-run', 'dryRun'],
    ['--details', 'details'],
    ['--initialize', 'initialize'],
  ]);
  const seen = new Set();

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (seen.has(argument)) throw new Error(`duplicate option: ${argument}`);
    seen.add(argument);
    if (booleanOptions.has(argument)) {
      options[booleanOptions.get(argument)] = true;
      continue;
    }
    if (valueOptions.has(argument)) {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a file path`);
      options[valueOptions.get(argument)] = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${argument}`);
  }
  return options;
}

async function readJson(file, label) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`${path.relative(repositoryRoot, file)}: ${error.message}`);
  }
}

async function atomicWrite(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, content, 'utf8');
    await rename(temporary, file);
  } catch (error) {
    try {
      await unlink(temporary);
    } catch {
      // Preserve the original write error.
    }
    throw error;
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const services = await loadCanonicalServices();
  const registry = await readJson(upstreamsFile, 'sources/upstreams.json');
  const previousState = await readOptionalJson(options.output);

  if (options.initialize && previousState) {
    throw new Error(`${path.relative(repositoryRoot, options.output)} already exists; initialization refuses to replace a baseline`);
  }
  if (!previousState && !options.initialize && !options.dryRun) {
    throw new Error(`${path.relative(repositoryRoot, options.output)} does not exist; run once with --initialize`);
  }

  const { state, report } = await auditSources({
    services,
    registry,
    previousState,
    initialize: options.initialize,
  });
  printReport(report, options.details);

  const serializedState = `${JSON.stringify(state, null, 2)}\n`;
  const previousSerialized = previousState ? `${JSON.stringify(previousState, null, 2)}\n` : null;
  if (!options.dryRun && serializedState !== previousSerialized) {
    await atomicWrite(options.output, serializedState);
    console.log(`Wrote ${path.relative(repositoryRoot, options.output)}.`);
  } else if (options.dryRun) {
    console.log('Dry run: audit state was not written.');
  }

  if (options.summary) {
    await atomicWrite(options.summary, renderSummary(report));
    console.log(`Wrote summary ${options.summary}.`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
