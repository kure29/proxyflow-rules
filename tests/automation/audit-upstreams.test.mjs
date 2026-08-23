import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuditError,
  auditSources,
  compareCandidateRules,
  fetchHttps,
  officialContentHash,
  parseCommunityList,
  renderSummary,
  sha256,
} from '../../scripts/audit-upstreams.mjs';
import { canonicalRuleText } from '../../scripts/generate-rules.mjs';

const communityUrl = 'https://community.test/service.list';
const officialUrl = 'https://official.test/evidence';

function service(rules = [
  { type: 'DOMAIN-SUFFIX', value: 'accepted.test' },
  { type: 'DOMAIN', value: 'canonical-only.test' },
]) {
  return {
    service: 'OpenAI',
    sources: [
      {
        id: 'official-evidence',
        kind: 'official-documentation',
        url: officialUrl,
      },
      {
        id: 'independent-check',
        kind: 'independent-network-verification',
        url: 'https://independent.test/check',
      },
    ],
    rules,
  };
}

function registry() {
  return {
    schemaVersion: 1,
    community: {
      id: 'synthetic-community-index',
      role: 'community-candidate-index',
      repository: 'https://community.test/repository',
      license: 'GPL-2.0',
      format: 'surge-typed-list',
      feeds: [
        {
          service: 'OpenAI',
          status: 'available',
          url: communityUrl,
        },
      ],
    },
  };
}

function fixtureFetch(communityBody, officialBody = 'official evidence body') {
  return async (url) => {
    if (url === communityUrl) return communityBody;
    if (url === officialUrl) return officialBody;
    throw new Error(`unexpected fixture URL: ${url}`);
  };
}

test('parses and normalizes supported rules while reporting duplicates, unsupported types, and invalid rules', () => {
  const parsed = parseCommunityList(`
# synthetic fixture
domain-suffix, Accepted.TEST
DOMAIN-SUFFIX,accepted.test
DOMAIN-KEYWORD,Example
IP-CIDR,192.0.2.0/24,no-resolve
IP-CIDR6,2001:DB8::/32,no-resolve
IP-ASN,64500
OR,((DOMAIN,a.test),(DOMAIN,b.test))
DOMAIN-SUFFIX,localhost
`);

  assert.deepEqual(parsed.candidates, [
    { type: 'DOMAIN-SUFFIX', value: 'accepted.test', noResolve: false },
    { type: 'DOMAIN-KEYWORD', value: 'example', noResolve: false },
    { type: 'IP-CIDR', value: '192.0.2.0/24', noResolve: true },
    { type: 'IP-CIDR6', value: '2001:db8::/32', noResolve: true },
  ]);
  assert.equal(parsed.duplicates, 1);
  assert.deepEqual(parsed.unsupportedTypes, [
    { type: 'IP-ASN', count: 1 },
    { type: 'OR', count: 1 },
  ]);
  assert.deepEqual(parsed.invalidRules, [
    { line: 10, reason: 'DOMAIN-SUFFIX has an invalid value' },
  ]);
  assert.equal(parsed.candidateHashes.length, 4);
  assert(parsed.candidateHashes.every((hash) => /^sha256:[a-f0-9]{64}$/.test(hash)));
});

test('community source fingerprints ignore comments, ordering, case, and field whitespace', () => {
  const first = parseCommunityList(`# first header\nDOMAIN,a.accepted.test\nDOMAIN,b.accepted.test\n`);
  const second = parseCommunityList(`# changed header\ndomain, B.Accepted.TEST\nDOMAIN , a.accepted.test\n`);

  assert.equal(first.sourceHash, second.sourceHash);
  assert.deepEqual(first.candidateHashes, second.candidateHashes);
});

test('official HTML fingerprints ignore request scripts and tag attributes but detect visible changes', () => {
  const first = officialContentHash({
    contentType: 'text/html; charset=utf-8',
    body: '<html data-request="one"><body><h1 class="a">Network guide</h1><script nonce="1">dynamic()</script></body></html>',
  });
  const equivalent = officialContentHash({
    contentType: 'text/html; charset=utf-8',
    body: '<html data-request="two"><body><h1 class="b">Network guide</h1><script nonce="2">other()</script></body></html>',
  });
  const changed = officialContentHash({
    contentType: 'text/html; charset=utf-8',
    body: '<html><body><h1>Updated network guide</h1></body></html>',
  });

  assert.equal(first, equivalent);
  assert.notEqual(first, changed);
});

test('official JSON fingerprints ignore object key order', () => {
  const first = officialContentHash({ contentType: 'application/json', body: '{"b":2,"a":{"d":4,"c":3}}' });
  const second = officialContentHash({ contentType: 'application/json', body: '{"a":{"c":3,"d":4},"b":2}' });
  assert.equal(first, second);
});

test('official fingerprints prefer stable HTTP content validators', () => {
  const first = officialContentHash({
    contentType: 'text/html',
    entityTag: 'W/"stable-version"',
    lastModified: 'Mon, 24 Aug 2026 00:00:00 GMT',
    body: '<html>dynamic first response</html>',
  });
  const second = officialContentHash({
    contentType: 'text/html',
    entityTag: 'W/"stable-version"',
    lastModified: 'Mon, 24 Aug 2026 00:00:00 GMT',
    body: '<html>dynamic second response</html>',
  });
  const strongEquivalent = officialContentHash({
    contentType: 'text/html',
    entityTag: '"stable-version"',
    body: '<html>another dynamic response</html>',
  });
  assert.equal(first, second);
  assert.equal(first, strongEquivalent);
});

test('compares overlap, community-only, canonical-only, added, and removed candidates', () => {
  const previousRules = [
    { type: 'DOMAIN', value: 'removed.test' },
    { type: 'DOMAIN', value: 'overlap.test' },
  ];
  const currentRules = [
    { type: 'DOMAIN', value: 'overlap.test' },
    { type: 'DOMAIN', value: 'added.test' },
  ];
  const canonicalRules = [
    { type: 'DOMAIN', value: 'overlap.test' },
    { type: 'DOMAIN', value: 'canonical-only.test' },
  ];
  const previousHashes = previousRules.map((rule) => sha256(canonicalRuleText(rule))).sort();
  const comparison = compareCandidateRules(currentRules, canonicalRules, previousHashes);

  assert.deepEqual(comparison.acceptedOverlap, ['DOMAIN,overlap.test']);
  assert.deepEqual(comparison.communityOnly, ['DOMAIN,added.test']);
  assert.deepEqual(comparison.canonicalOnly, ['DOMAIN,canonical-only.test']);
  assert.equal(comparison.addedCandidateCount, 1);
  assert.equal(comparison.removedCandidateCount, 1);
});

test('initializes a deterministic baseline without reporting every candidate as added', async () => {
  const result = await auditSources({
    services: [service()],
    registry: registry(),
    initialize: true,
    fetchContent: fixtureFetch('DOMAIN-SUFFIX,accepted.test\nDOMAIN,community-only.test\n'),
  });

  assert.equal(result.report.changed, false);
  assert.equal(result.report.services[0].community.status, 'INITIALIZED');
  assert.equal(result.report.services[0].community.addedCandidateCount, 0);
  assert.equal(result.report.services[0].community.removedCandidateCount, 0);
  assert.equal(result.report.services[0].community.acceptedOverlap, 1);
  assert.equal(result.report.services[0].community.communityOnly, 1);
  assert.equal(result.report.services[0].community.canonicalOnly, 1);
  assert.equal(result.state.services.OpenAI.community.candidateCount, 2);
  assert.deepEqual(Object.keys(result.state.services.OpenAI.official), ['official-evidence']);
});

test('reports an unchanged source when semantic candidates and official content are unchanged', async () => {
  const initial = await auditSources({
    services: [service()],
    registry: registry(),
    initialize: true,
    fetchContent: fixtureFetch('# first\nDOMAIN-SUFFIX,accepted.test\nDOMAIN,community-only.test\n'),
  });
  const next = await auditSources({
    services: [service()],
    registry: registry(),
    previousState: initial.state,
    fetchContent: fixtureFetch('# new comment\nDOMAIN,community-only.test\nDOMAIN-SUFFIX,accepted.test\n'),
  });

  assert.deepEqual(next.state, initial.state);
  assert.equal(next.report.changed, false);
  assert.equal(next.report.services[0].community.status, 'UNCHANGED');
  assert.equal(next.report.services[0].community.addedCandidateCount, 0);
  assert.equal(next.report.services[0].community.removedCandidateCount, 0);
  assert.equal(next.report.services[0].official[0].status, 'UNCHANGED');
});

test('preserves prior community and official state after fetch failures', async () => {
  const initial = await auditSources({
    services: [service()],
    registry: registry(),
    initialize: true,
    fetchContent: fixtureFetch('DOMAIN-SUFFIX,accepted.test\n'),
  });
  const failed = await auditSources({
    services: [service()],
    registry: registry(),
    previousState: initial.state,
    fetchContent: async () => {
      throw new Error('synthetic network failure');
    },
  });

  assert.deepEqual(failed.state, initial.state);
  assert.equal(failed.report.changed, false);
  assert.equal(failed.report.services[0].community.status, 'FETCH_FAILED');
  assert.equal(failed.report.services[0].community.currentCount, null);
  assert.equal(failed.report.services[0].official[0].status, 'FETCH_FAILED');
});

test('preserves prior candidates after a parse failure', async () => {
  const initial = await auditSources({
    services: [service()],
    registry: registry(),
    initialize: true,
    fetchContent: fixtureFetch('DOMAIN-SUFFIX,accepted.test\n'),
  });
  const failed = await auditSources({
    services: [service()],
    registry: registry(),
    previousState: initial.state,
    fetchContent: fixtureFetch('# comments only\n'),
  });

  assert.deepEqual(failed.state, initial.state);
  assert.equal(failed.report.services[0].community.status, 'PARSE_FAILED');
});

test('preserves prior official state when repeated content fingerprints are unstable', async () => {
  const initial = await auditSources({
    services: [service()],
    registry: registry(),
    initialize: true,
    fetchContent: fixtureFetch('DOMAIN-SUFFIX,accepted.test\n'),
  });
  let officialCalls = 0;
  const unstable = await auditSources({
    services: [service()],
    registry: registry(),
    previousState: initial.state,
    fetchContent: async (url) => {
      if (url === communityUrl) return 'DOMAIN-SUFFIX,accepted.test\n';
      if (url === officialUrl) {
        officialCalls += 1;
        return {
          contentType: 'text/html',
          body: `<html><body>version ${officialCalls}</body></html>`,
        };
      }
      throw new Error(`unexpected fixture URL: ${url}`);
    },
  });

  assert.equal(officialCalls, 2);
  assert.deepEqual(unstable.state, initial.state);
  assert.equal(unstable.report.services[0].official[0].status, 'UNSTABLE_CONTENT');
});

test('tracked state contains hashes and counts but no upstream body, matcher list, URLs, or timestamps', async () => {
  const communityBody = 'DOMAIN-SUFFIX,private-candidate.test\n';
  const officialBody = 'private official source content';
  const result = await auditSources({
    services: [service()],
    registry: registry(),
    initialize: true,
    fetchContent: fixtureFetch(communityBody, officialBody),
  });
  const serialized = JSON.stringify(result.state);

  assert(!serialized.includes('private-candidate.test'));
  assert(!serialized.includes(officialBody));
  assert(!serialized.includes(communityUrl));
  assert(!serialized.includes(officialUrl));
  assert(!serialized.includes('checkedAt'));
  assert.deepEqual(Object.keys(result.state.services.OpenAI.community), [
    'sourceHash',
    'candidateCount',
    'candidateHashes',
  ]);
});

test('summary contains review counts and the manual-review boundary without candidate bodies', async () => {
  const result = await auditSources({
    services: [service()],
    registry: registry(),
    initialize: true,
    fetchContent: fixtureFetch('DOMAIN-SUFFIX,accepted.test\n'),
  });
  const summary = renderSummary(result.report);

  assert.match(summary, /Previous count/);
  assert.match(summary, /Added candidate count/);
  assert.match(summary, /Canonical overlap/);
  assert.match(summary, /independent evidence and manual review/);
  assert(!summary.includes('accepted.test'));
});

test('rejects an empty synthetic feed as a stable parse failure', () => {
  assert.throws(
    () => parseCommunityList('# no rules\n'),
    (error) => error instanceof AuditError && error.status === 'PARSE_FAILED',
  );
});

test('rejects insecure and literal-IP upstream URLs before fetching', async () => {
  await assert.rejects(
    fetchHttps('http://official.test/source'),
    (error) => error instanceof AuditError && error.status === 'FETCH_FAILED',
  );
  await assert.rejects(
    fetchHttps('https://127.0.0.1/source'),
    (error) => error instanceof AuditError && error.status === 'FETCH_FAILED',
  );
});
