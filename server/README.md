# JSearch proxy (Node 22+)

No dependencies. Run `node server/index.mjs` from the repository root with
`OPENWEBNINJA_API_KEY` set in the **server** environment. Never put this secret in
an `EXPO_PUBLIC_*` variable, client code, or source control. Node 22 can also load
a private environment file with `node --env-file=.env server/index.mjs`.

Local defaults: `127.0.0.1:8787`. `PORT` overrides the port; `HOST=0.0.0.0` is an
explicit opt-in for LAN/device testing and exposes the service to the network.
`ALLOWED_ORIGINS` is a comma-separated exact-origin allowlist, defaulting to
`http://localhost:8081,http://127.0.0.1:8081`. A configured allowlist replaces those
defaults; a wildcard is not supported. Unexpected Origins (including `null`) are
rejected. Origin-less native/server requests are allowed. OPTIONS returns 204
with GET/OPTIONS CORS headers without consuming quota or requiring a key.

## Client contract

`GET /api/jobs?query=developer&location=Chicago%2C%20IL&remote=true&cursor=...`

- `query`: required, trimmed, 1–160 characters.
- `location`: optional, trimmed, at most 120 characters; blank/absent defaults to
  `United States`. Intended for a US city/state.
- `remote`: optional, exactly `true` or `false`. Only true enables the upstream
  work-from-home filter; false does not mean exclude remote jobs.
- `cursor`: optional, opaque, at most 8192 characters, not trimmed.
- Duplicate known parameters are rejected. Unknown parameters are ignored and
  never forwarded. Lengths use JavaScript string length (UTF-16 code units).

Success: `{ "jobs": [/* unchanged upstream job objects */], "nextCursor": "..." }`.
An absent, null, or empty upstream cursor becomes `nextCursor: null`.
No normalization or field projection is performed. Validation checks the envelope,
object-valued job entries, and cursor type/length, not each individual job field.

Errors: `{ "error": { "code": "...", "message": "..." } }`.
400 invalid input, 403 forbidden Origin, 404 wrong path, 405 wrong method,
429 local/upstream quota, 503 missing/rejected server credentials or busy proxy,
504 upstream timeout, 502 provider/network/JSON/schema failures. Error messages
never include upstream error bodies, arbitrary exception text, or credentials.
Responses use `Cache-Control: no-store`; successful results are cached internally.

## Verified provider schema

Verified against:
https://openwebninja.s3.us-east-1.amazonaws.com/portal/openapi/jsearch.yaml

Upstream: `GET https://api.openwebninja.com/jsearch/search-v2`, authenticated using
`x-api-key: OPENWEBNINJA_API_KEY`. Query is `keyword in city/state, United States`
or `keyword in United States` without a supplied location; an existing trailing
`, United States` on location is not duplicated. Always sends `country=us`,
`language=en`, `num_pages=1`; sends `work_from_home=true` only for remote=true and
forwards a nonempty cursor. Redirects are rejected so credentials stay at the
fixed provider endpoint. There are no automatic retries.

The documented success envelope is
`{ status: "OK", request_id, parameters, data: { jobs: object[], cursor?: string | null } }`.
`data` is **not** a jobs array on search-v2 (unlike job-details). The documented
required job fields are `job_id`, `job_title`, `employer_name`, `job_publisher`,
`job_apply_link`; all other provider fields are preserved too.

## Limits and injectable configuration

`createJobsHandler(config?)` in `server/jobs.mjs` returns a Node req/res handler.
`createJobsServer(config?)` in `server/index.mjs` creates a server without listening.
`api/jobs.mjs` exports a module-scoped default handler for Node-compatible
serverless runtimes (not an Edge/Fetch Request runtime).

| Config option | Default |
| --- | --- |
| `fetch` | native `globalThis.fetch` |
| `apiKey` | `OPENWEBNINJA_API_KEY` or empty |
| `now` | `Date.now` (milliseconds) |
| `ttlMs` | 900000 (15 minutes); 0 disables caching |
| `timeoutMs` | 15000 (includes reading the body) |
| `allowedOrigins` | array or comma string; otherwise `ALLOWED_ORIGINS`/defaults |
| `perIpLimit` | `JOBS_PER_IP_LIMIT` or 30 misses/minute/IP |
| `hourlyLimit` | `JOBS_UPSTREAM_HOURLY_LIMIT` or 20 upstream attempts/rolling hour |
| `maxCacheEntries` | 100 (LRU eviction) |
| `maxCacheBytes` | 8388608 (serialized response bytes) |
| `maxResponseBytes` | 2097152 (upstream body bytes) |
| `maxIpEntries` | 1000 (reject new IPs when full, rather than evicting counters) |
| `maxInFlight` | 20 distinct upstream requests |

Numeric limits must be safe integers; quota limits may be 0 to block all misses.
Cache hits and identical in-flight joins consume no quota. Failed upstream
attempts still consume quota since they may be billable. Expired entries are
pruned on requests. Per-IP counters use fixed one-minute windows; the hourly
upstream budget is rolling. Identical effective query parameters share state,
including remote=false and omitted remote. No provider calls are made by tests.

## Production/serverless requirements (include in parent deployment docs)

**This is a local-development guardrail, not a production authorization system.**
Before public/LAN production deployment, require application authentication and
authorization, trusted-proxy-aware per-user/IP rate limits, and a shared durable
upstream-spend budget enforced across all instances. Configure provider-side
billing limits/alerts as well. CORS does not protect against native clients,
curl, or forged/absent Origin headers. The handler intentionally ignores
`X-Forwarded-For`; behind a proxy, socket IP limits may group all clients together.

Caches, deduplication, and budgets are in memory per handler/process: cold starts,
restarts, multiple instances, and separate handlers reset or multiply them.
The included serverless entry does **not** add authentication or distributed
limits. Provision those at the deployment gateway before exposing it publicly.
Allow the function runtime more than 15 seconds so sanitized timeout responses
can complete. Keep the API key server-only and use HTTPS in production.

Validation: `node --test server/*.test.mjs` from the repository root.
