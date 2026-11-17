import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createJobsHandler } from './jobs.mjs';
import { createJobsServer } from './index.mjs';
import serverlessHandler from '../api/jobs.mjs';

const rawJob = {
  job_id: 'woj2gE2S_6LqvmLAAAAAAA==', job_title: 'Senior Developer',
  employer_name: 'United Airlines', job_publisher: 'United Airlines Jobs',
  job_apply_link: 'https://careers.example.com/apply', employer_logo: null,
  job_salary: null, job_employment_types: ['FULLTIME'],
  apply_options: [{ publisher: 'Indeed', apply_link: 'https://example.com/apply', is_direct: true }],
  job_highlights: { Qualifications: ['Experience'] }, future_provider_field: { preserved: true },
};
const envelope = (jobs = [rawJob], cursor = 'eyJwYWdlIjoyfQ==') => ({
  status: 'OK', request_id: 'request-id', parameters: {}, data: { jobs, cursor },
});
const success = () => Response.json(envelope());
const handler = (config = {}) => createJobsHandler({ apiKey: 'test-server-secret', fetch: success, ...config });

async function request(handle, url = '/api/jobs?query=developer', options = {}) {
  const headers = {};
  let body = '';
  const res = {
    statusCode: 200,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value = '') { body = value; },
  };
  await handle({ method: options.method ?? 'GET', url, headers: options.headers ?? {},
    socket: { remoteAddress: options.ip ?? '127.0.0.1' } }, res);
  return { status: res.statusCode, headers, body, json: body ? JSON.parse(body) : null };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('validates input before any upstream request', async () => {
  let calls = 0;
  const handle = handler({ fetch: () => { calls++; return success(); } });
  const invalid = [
    '', '?query=', '?query=%20%20', `?query=${'x'.repeat(161)}`,
    `?query=x&location=${'x'.repeat(121)}`, `?query=x&cursor=${'x'.repeat(8193)}`,
    '?query=x&remote=True', '?query=x&remote=', '?query=x&remote=1',
    '?query=x&query=y', '?query=x&location=a&location=b',
    '?query=x&remote=true&remote=false', '?query=x&cursor=a&cursor=b',
  ];
  for (const suffix of invalid) {
    const result = await request(handle, `/api/jobs${suffix}`);
    assert.equal(result.status, 400, suffix);
    assert.equal(result.json.error.code, 'INVALID_QUERY');
  }
  assert.equal(calls, 0);
});

test('accepts trimmed limits and opaque cursor, constructs upstream auth/params, preserves raw jobs', async () => {
  let captured;
  const handle = handler({ fetch: (url, options) => { captured = { url: new URL(url), options }; return success(); } });
  const params = new URLSearchParams({ query: `  ${'x'.repeat(160)}  `, location: ` ${'y'.repeat(120)} `,
    remote: 'true', cursor: ' +/opaque== ', apiKey: 'attacker-value', num_pages: '20' });
  const result = await request(handle, `/api/jobs?${params}`);
  assert.equal(result.status, 200);
  assert.deepEqual(result.json, { jobs: [rawJob], nextCursor: 'eyJwYWdlIjoyfQ==' });
  assert.equal(captured.url.origin + captured.url.pathname, 'https://api.openwebninja.com/jsearch/search-v2');
  assert.deepEqual(Object.fromEntries(captured.url.searchParams), {
    query: `${'x'.repeat(160)} in ${'y'.repeat(120)}, United States`,
    country: 'us', language: 'en', num_pages: '1', work_from_home: 'true', cursor: ' +/opaque== ',
  });
  assert.equal(captured.options.headers['x-api-key'], 'test-server-secret');
  assert.equal(captured.options.redirect, 'error');
  assert.ok(captured.options.signal instanceof AbortSignal);
  assert.equal(result.body.includes('test-server-secret'), false);
});

test('location defaults and suffix, remote=false omitted, empty and absent cursors map to null', async () => {
  for (const [suffix, expected] of [
    ['', 'developer in United States'], ['&location=', 'developer in United States'],
    ['&location=United%20States', 'developer in United States'],
    ['&location=Chicago%2C%20IL', 'developer in Chicago, IL, United States'],
    ['&location=Chicago%2C%20United%20States', 'developer in Chicago, United States'],
  ]) {
    const handle = handler({ fetch: (url) => {
      const params = new URL(url).searchParams;
      assert.equal(params.get('query'), expected);
      assert.equal(params.has('work_from_home'), false);
      assert.equal(params.has('cursor'), false);
      return Response.json({ status: 'OK', data: { jobs: [] } });
    } });
    const result = await request(handle, `/api/jobs?query=developer&remote=false&cursor=${suffix}`);
    assert.deepEqual(result.json, { jobs: [], nextCursor: null });
  }
  for (const cursor of [null, '']) {
    assert.deepEqual((await request(handler({ fetch: () => Response.json(envelope([], cursor)) }))).json,
      { jobs: [], nextCursor: null });
  }
});

test('missing key is actionable 503 with no provider request', async () => {
  const result = await request(handler({ apiKey: '', fetch: () => assert.fail('must not fetch') }));
  assert.equal(result.status, 503);
  assert.equal(result.json.error.code, 'MISSING_API_KEY');
  assert.match(result.json.error.message, /OPENWEBNINJA_API_KEY/);
});

test('sanitizes provider HTTP and network errors without leaking secrets', async () => {
  for (const [upstream, status, code] of [
    [401, 503, 'UPSTREAM_AUTH'], [403, 503, 'UPSTREAM_AUTH'],
    [429, 429, 'UPSTREAM_RATE_LIMITED'], [500, 502, 'UPSTREAM_FAILURE'], [302, 502, 'UPSTREAM_FAILURE'],
  ]) {
    const result = await request(handler({ fetch: () => new Response('test-server-secret PRIVATE', { status: upstream }) }));
    assert.equal(result.status, status);
    assert.equal(result.json.error.code, code);
    assert.doesNotMatch(result.body, /test-server-secret|PRIVATE/);
    if (upstream === 429) assert.equal(result.headers['retry-after'], '60');
  }
  const result = await request(handler({ fetch: () => { throw new Error('test-server-secret PRIVATE'); } }));
  assert.equal(result.status, 502);
  assert.doesNotMatch(result.body, /test-server-secret|PRIVATE/);
});

test('rejects invalid JSON, wrong schema, invalid job entries and oversized responses', async () => {
  for (const payload of [null, [], {}, { data: [] }, { status: 'ERROR', data: { jobs: [] } },
    { status: 'OK', data: { jobs: 'bad' } }, envelope([null]), envelope([[]]), envelope(['job']),
    envelope([], 123), envelope([], {}), envelope([], 'x'.repeat(8193))]) {
    const result = await request(handler({ fetch: () => Response.json(payload) }));
    assert.equal(result.status, 502, JSON.stringify(payload));
    assert.equal(result.json.error.code, 'INVALID_UPSTREAM');
  }
  assert.equal((await request(handler({ fetch: () => new Response('PRIVATE not JSON') }))).json.error.code, 'INVALID_UPSTREAM');
  assert.equal((await request(handler({ maxResponseBytes: 10 }))).json.error.code, 'INVALID_UPSTREAM');
});

test('timeout covers fetch and body and aborts the upstream request', async () => {
  let signal;
  const result = await request(handler({ timeoutMs: 10, fetch: (_, options) => {
    signal = options.signal;
    return new Promise(() => {});
  } }));
  assert.equal(result.status, 504);
  assert.equal(result.json.error.code, 'UPSTREAM_TIMEOUT');
  assert.equal(signal.aborted, true);
  const bodyResult = await request(handler({ timeoutMs: 10, fetch: () => new Response(new ReadableStream({ start() {} })) }));
  assert.equal(bodyResult.status, 504);
});

test('TTL cache consumes no quota; expiry and rolling hour reset are clock injectable', async () => {
  let time = 0;
  let calls = 0;
  const handle = handler({ now: () => time, ttlMs: 100, hourlyLimit: 1, fetch: () => { calls++; return success(); } });
  assert.equal((await request(handle)).status, 200);
  time = 99;
  assert.equal((await request(handle, '/api/jobs?query=%20developer%20&remote=false')).status, 200);
  assert.equal(calls, 1);
  time = 100;
  assert.equal((await request(handle)).json.error.code, 'UPSTREAM_BUDGET_EXCEEDED');
  time = 3_600_000;
  assert.equal((await request(handle)).status, 200);
  assert.equal(calls, 2);
});

test('deduplicates concurrent requests and serves joins with no quota', async () => {
  const gate = deferred();
  let calls = 0;
  const handle = handler({ hourlyLimit: 1, perIpLimit: 1, fetch: () => { calls++; return gate.promise; } });
  const first = request(handle);
  const second = request(handle, '/api/jobs?query=developer', { ip: 'other' });
  assert.equal(calls, 1);
  gate.resolve(success());
  const results = await Promise.all([first, second]);
  assert.deepEqual(results[0].json, results[1].json);
  assert.equal(results[1].status, 200);
  assert.equal((await request(handle)).status, 200);
});

test('failed requests are not cached; dedupe reservations are released but attempts still cost quota', async () => {
  let calls = 0;
  const handle = handler({ hourlyLimit: 2, fetch: () => { calls++; return new Response('PRIVATE', { status: 500 }); } });
  assert.equal((await request(handle)).status, 502);
  assert.equal((await request(handle)).status, 502);
  assert.equal((await request(handle)).status, 429);
  assert.equal(calls, 2);
});

test('LRU cache entry and byte bounds evict, oversized cache entries are not stored', async () => {
  let calls = 0;
  const handle = handler({ maxCacheEntries: 2, fetch: () => { calls++; return success(); } });
  const search = (query) => request(handle, `/api/jobs?query=${query}`);
  await search('a'); await search('b'); await search('a'); await search('c'); await search('b');
  assert.equal(calls, 4);
  calls = 0;
  const tiny = handler({ maxCacheBytes: 1, fetch: () => { calls++; return success(); } });
  await request(tiny); await request(tiny);
  assert.equal(calls, 2);
  calls = 0;
  const bodyBytes = Buffer.byteLength(JSON.stringify({ jobs: [rawJob], nextCursor: 'eyJwYWdlIjoyfQ==' }));
  const one = handler({ maxCacheBytes: bodyBytes, fetch: () => { calls++; return success(); } });
  await request(one); await request(one, '/api/jobs?query=other'); await request(one);
  assert.equal(calls, 3);
});

test('per-IP limits ignore spoofed forwarding headers, bound tracked IPs, and reset', async () => {
  let time = 0;
  const handle = handler({ now: () => time, perIpLimit: 1, maxIpEntries: 1 });
  assert.equal((await request(handle)).status, 200);
  const limited = await request(handle, '/api/jobs?query=other', { headers: { 'x-forwarded-for': 'new-ip' } });
  assert.equal(limited.status, 429);
  assert.equal(limited.json.error.code, 'RATE_LIMITED');
  assert.equal(limited.headers['retry-after'], '60');
  assert.equal((await request(handle, '/api/jobs?query=other', { ip: 'new-ip' })).status, 429);
  assert.equal((await request(handle, '/api/jobs?query=developer', { ip: 'new-ip' })).status, 200);
  time = 60_000;
  assert.equal((await request(handle, '/api/jobs?query=other', { ip: 'new-ip' })).status, 200);
});

test('bounds distinct in-flight requests', async () => {
  const gate = deferred();
  const handle = handler({ maxInFlight: 1, fetch: () => gate.promise });
  const pending = request(handle);
  const busy = await request(handle, '/api/jobs?query=other');
  assert.equal(busy.status, 503);
  assert.equal(busy.json.error.code, 'BUSY');
  gate.resolve(success());
  assert.equal((await pending).status, 200);
});

test('CORS, preflight, methods, paths, and explicit allowlist', async () => {
  const handle = handler({ apiKey: '' });
  for (const origin of ['http://localhost:8081', 'http://127.0.0.1:8081']) {
    const result = await request(handle, '/api/jobs', { method: 'OPTIONS', headers: { origin } });
    assert.equal(result.status, 204);
    assert.equal(result.body, '');
    assert.equal(result.headers['access-control-allow-origin'], origin);
    assert.equal(result.headers['access-control-allow-methods'], 'GET, OPTIONS');
    assert.equal(result.headers.vary, 'Origin');
  }
  for (const origin of ['https://evil.example', 'null', 'http://localhost:8081.evil.example']) {
    const result = await request(handle, '/api/jobs', { method: 'OPTIONS', headers: { origin } });
    assert.equal(result.status, 403);
    assert.equal(result.headers['access-control-allow-origin'], undefined);
  }
  const configured = handler({ allowedOrigins: ' https://jobbo.example ,https://other.example' });
  assert.equal((await request(configured, undefined, { headers: { origin: 'https://jobbo.example' } })).status, 200);
  assert.equal((await request(configured, undefined, { headers: { origin: 'http://localhost:8081' } })).status, 403);
  const post = await request(handle, '/api/jobs', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, OPTIONS');
  assert.equal((await request(handle, '/elsewhere')).status, 404);
});

test('zero budgets block misses and bad numeric config fails early', async () => {
  assert.equal((await request(handler({ hourlyLimit: 0 }))).status, 429);
  assert.equal((await request(handler({ perIpLimit: 0 }))).status, 429);
  for (const config of [{ timeoutMs: 0 }, { maxCacheEntries: -1 }, { hourlyLimit: NaN }, { ttlMs: -1 }]) {
    assert.throws(() => handler(config), TypeError);
  }
});

test('Node HTTP and serverless entry compatibility without a persistent listener', async (t) => {
  assert.equal(typeof serverlessHandler, 'function');
  const server = createJobsServer({ apiKey: 'test-key', fetch: success });
  t.after(() => new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/jobs?query=developer`, {
    headers: { Origin: 'http://localhost:8081' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { jobs: [rawJob], nextCursor: 'eyJwYWdlIjoyfQ==' });
});
