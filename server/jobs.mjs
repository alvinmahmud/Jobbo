const UPSTREAM = 'https://api.openwebninja.com/jsearch/search-v2';
const DEFAULT_ORIGINS = 'http://localhost:8081,http://127.0.0.1:8081';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

class ProxyError extends Error {
  constructor(status, code, message, retryAfter) {
    super(message);
    Object.assign(this, { status, code, retryAfter });
  }
}

function integer(value, fallback, minimum = 1) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) throw new TypeError('Invalid jobs proxy numeric configuration');
  return number;
}

function searchParams(url) {
  const params = url.searchParams;
  for (const name of ['query', 'location', 'remote', 'cursor']) {
    if (params.getAll(name).length > 1) {
      throw new ProxyError(400, 'INVALID_QUERY', `Supply ${name} only once.`);
    }
  }
  const query = (params.get('query') ?? '').trim();
  const location = (params.get('location') ?? '').trim() || 'United States';
  const remote = params.get('remote');
  const cursor = params.get('cursor') ?? '';
  if (!query || query.length > 160) {
    throw new ProxyError(400, 'INVALID_QUERY', 'query is required and must be at most 160 characters after trimming.');
  }
  if (location.length > 120 || cursor.length > 8192 || (remote !== null && remote !== 'true' && remote !== 'false')) {
    throw new ProxyError(400, 'INVALID_QUERY', 'location must be at most 120 characters, cursor at most 8192, and remote must be true or false.');
  }
  const region = /^United States$/i.test(location) || /,\s*United States$/i.test(location)
    ? location : `${location}, United States`;
  const result = new URLSearchParams({ query: `${query} in ${region}`, country: 'us', language: 'en', num_pages: '1' });
  if (remote === 'true') result.set('work_from_home', 'true');
  if (cursor) result.set('cursor', cursor);
  return result;
}

/**
 * Node 22 req/res handler. All state and limits are per handler instance, not distributed.
 * See README.md for config, deployment requirements, and the verified upstream schema.
 */
export function createJobsHandler(config = {}) {
  const fetchUpstream = config.fetch ?? globalThis.fetch;
  const apiKey = (config.apiKey ?? process.env.OPENWEBNINJA_API_KEY ?? '').trim();
  const now = config.now ?? Date.now;
  const ttlMs = integer(config.ttlMs, 15 * MINUTE, 0);
  const timeoutMs = integer(config.timeoutMs, 15_000);
  const maxCacheEntries = integer(config.maxCacheEntries, 100);
  const maxCacheBytes = integer(config.maxCacheBytes, 8 * 1024 * 1024);
  const maxResponseBytes = integer(config.maxResponseBytes, 2 * 1024 * 1024);
  const maxIpEntries = integer(config.maxIpEntries, 1000);
  const maxInFlight = integer(config.maxInFlight, 20);
  const perIpLimit = integer(config.perIpLimit ?? process.env.JOBS_PER_IP_LIMIT, 30, 0);
  const hourlyLimit = integer(config.hourlyLimit ?? process.env.JOBS_UPSTREAM_HOURLY_LIMIT, 20, 0);
  const origins = config.allowedOrigins ?? process.env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS;
  const allowedOrigins = new Set((Array.isArray(origins) ? origins : origins.split(',')).map((value) => value.trim()).filter(Boolean));
  const cache = new Map();
  const inFlight = new Map();
  const ips = new Map();
  const upstreamCalls = [];
  let cacheBytes = 0;

  function removeCache(key) {
    cacheBytes -= cache.get(key).bytes;
    cache.delete(key);
  }

  function prune(time) {
    for (const [key, entry] of cache) if (entry.expires <= time) removeCache(key);
    for (const [ip, entry] of ips) if (entry.expires <= time) ips.delete(ip);
    while (upstreamCalls.length && upstreamCalls[0] <= time - HOUR) upstreamCalls.shift();
  }

  function reserveQuota(ip, time) {
    if (upstreamCalls.length >= hourlyLimit) {
      throw new ProxyError(429, 'UPSTREAM_BUDGET_EXCEEDED', 'Job search hourly budget reached. Try again later.',
        Math.max(1, Math.ceil(((upstreamCalls[0] ?? time) + HOUR - time) / 1000)));
    }
    const entry = ips.get(ip);
    if ((entry?.count ?? 0) >= perIpLimit || (!entry && ips.size >= maxIpEntries)) {
      throw new ProxyError(429, 'RATE_LIMITED', 'Too many job searches. Try again later.',
        Math.max(1, Math.ceil(((entry?.expires ?? time + MINUTE) - time) / 1000)));
    }
    if (inFlight.size >= maxInFlight) {
      throw new ProxyError(503, 'BUSY', 'Job search is busy. Try again shortly.', 1);
    }
    ips.set(ip, { count: (entry?.count ?? 0) + 1, expires: entry?.expires ?? time + MINUTE });
    // Failed requests may still cost credits, so reservations are never refunded.
    upstreamCalls.push(time);
  }

  async function load(params) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new ProxyError(504, 'UPSTREAM_TIMEOUT', 'Job search timed out. Try again.'));
        controller.abort();
      }, timeoutMs);
    });
    try {
      return await Promise.race([timeout, (async () => {
        const response = await fetchUpstream(`${UPSTREAM}?${params}`, {
          headers: { 'x-api-key': apiKey, accept: 'application/json' },
          signal: controller.signal,
          redirect: 'error',
        });
        if (!response.ok) {
          // Never forward upstream bodies, status text, headers, or error messages.
          if (response.body) await response.body.cancel();
          if (response.status === 401 || response.status === 403) {
            throw new ProxyError(503, 'UPSTREAM_AUTH', 'Job provider credentials were rejected. Ask the server operator to verify OPENWEBNINJA_API_KEY and JSearch access.');
          }
          if (response.status === 429) {
            throw new ProxyError(429, 'UPSTREAM_RATE_LIMITED', 'Job provider quota reached. Try again later.', 60);
          }
          throw new ProxyError(502, 'UPSTREAM_FAILURE', 'Job provider is unavailable. Try again later.');
        }
        // Bound both individual results and total cached bytes, not just entry count.
        const chunks = [];
        let bytes = 0;
        if (!response.body) throw new ProxyError(502, 'INVALID_UPSTREAM', 'Job provider returned an invalid response.');
        for await (const chunk of response.body) {
          bytes += chunk.byteLength;
          if (bytes > maxResponseBytes) {
            throw new ProxyError(502, 'INVALID_UPSTREAM', 'Job provider returned an invalid response.');
          }
          chunks.push(Buffer.from(chunk));
        }
        let payload;
        try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
          throw new ProxyError(502, 'INVALID_UPSTREAM', 'Job provider returned an invalid response.');
        }
        const data = payload?.data;
        if (!object(payload) || payload.status !== 'OK' || !object(data) || !Array.isArray(data.jobs)
          || !data.jobs.every(object)
          || (data.cursor !== undefined && data.cursor !== null && (typeof data.cursor !== 'string' || data.cursor.length > 8192))) {
          throw new ProxyError(502, 'INVALID_UPSTREAM', 'Job provider returned an invalid response.');
        }
        return JSON.stringify({ jobs: data.jobs, nextCursor: data.cursor || null });
      })()]);
    } finally {
      clearTimeout(timer);
    }
  }

  return async function jobsHandler(req, res) {
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    try {
      const origin = req.headers.origin;
      if (origin !== undefined && !allowedOrigins.has(origin)) {
        throw new ProxyError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed.');
      }
      if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/api/jobs') throw new ProxyError(404, 'NOT_FOUND', 'Not found.');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        throw new ProxyError(405, 'METHOD_NOT_ALLOWED', 'Use GET for job searches.');
      }
      const params = searchParams(url);
      if (!apiKey) throw new ProxyError(503, 'MISSING_API_KEY', 'Job search is not configured. Set OPENWEBNINJA_API_KEY on the server and restart or redeploy.');
      const key = params.toString();
      const time = now();
      prune(time);
      if (cache.has(key)) {
        const hit = cache.get(key);
        cache.delete(key);
        cache.set(key, hit);
        send(200, hit.body);
        return;
      }
      let pending = inFlight.get(key);
      if (!pending) {
        // Ignore forwarded headers: only a trusted deployment layer should resolve client IPs.
        reserveQuota(req.socket?.remoteAddress ?? 'unknown', time);
        pending = load(params).then((body) => {
          const bytes = Buffer.byteLength(body);
          if (ttlMs > 0 && bytes <= maxCacheBytes) {
            while (cache.size >= maxCacheEntries || cacheBytes + bytes > maxCacheBytes) removeCache(cache.keys().next().value);
            cache.set(key, { body, bytes, expires: now() + ttlMs });
            cacheBytes += bytes;
          }
          return body;
        }).finally(() => inFlight.delete(key));
        inFlight.set(key, pending);
      }
      send(200, await pending);
    } catch (error) {
      const safe = error instanceof ProxyError ? error : new ProxyError(502, 'UPSTREAM_FAILURE', 'Job search is unavailable. Try again later.');
      if (safe.retryAfter) res.setHeader('Retry-After', String(safe.retryAfter));
      send(safe.status, { error: { code: safe.code, message: safe.message } });
    }
  };
}

export default createJobsHandler();
