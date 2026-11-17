const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Use the existing TypeScript dependency without adding a test runner.
const compiled = ts.transpileModule(readFileSync(path.join(__dirname, "../utils/jobs.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const helpers = {};
new Function("exports", compiled)(helpers);
const { normalizeJob, formatJobSalary, formatJobAge, matchesJobFilters } = helpers;
const filters = { search: "", workTypes: [], jobTypes: [], experienceLevels: [], salaryMin: 0, salaryMax: 300000, sources: [] };

test("empty and malformed jobs normalize to unknown without inventing salaries or links", () => {
  for (const raw of [undefined, null, {}, [], "bad", { title: " ", skills: {}, requirements: null, salaryMin: NaN, salaryMax: "100000", sourceUrl: "javascript:alert(1)", companyLogo: "bad", workType: "bad", postedAt: "bad" }]) {
    const job = normalizeJob(raw, "demo");
    for (const field of ["title", "company", "companyLogo", "location", "workType", "jobType", "experienceLevel", "currency", "description", "source", "sourceUrl", "postedAt"]) assert.equal(job[field], "unknown", field);
    assert.deepEqual(job.skills, ["unknown"]);
    assert.deepEqual(job.requirements, ["unknown"]);
    assert.equal(job.salaryMin, null);
    assert.equal(job.salaryMax, null);
    assert.equal(job.isNew, false);
    assert.equal(formatJobSalary(job), "unknown");
    assert.equal(formatJobAge(job.postedAt), "unknown");
  }
});

test("valid fields survive normalization and lists are cleaned", () => {
  const job = normalizeJob({ title: " Engineer ", salaryMin: 120000, salaryMax: 160000, currency: "USD", skills: ["React", " ", 3, "React"], sourceUrl: "https://example.com/job", workType: "remote", postedAt: "2026-03-01" }, "source-2");
  assert.equal(job.id, "source-2");
  assert.equal(job.title, "Engineer");
  assert.deepEqual(job.skills, ["React"]);
  assert.equal(job.workType, "remote");
  assert.equal(job.sourceUrl, "https://example.com/job");
  assert.equal(formatJobSalary(job), "$120k - $160k");
  assert.equal(formatJobSalary(job, true), "$120k - $160k/yr");
  assert.equal(formatJobSalary({ ...job, currency: "EUR" }), "EUR 120k - EUR 160k");
});

test("invalid, reversed, or incomplete salaries never render NaN or a fabricated range", () => {
  for (const raw of [{ salaryMin: -1, salaryMax: Infinity }, { salaryMin: 200, salaryMax: 100 }, { salaryMin: 0 }]) {
    assert.equal(formatJobSalary(normalizeJob({ ...raw, currency: "USD" }, "demo")), "unknown");
  }
  assert.equal(formatJobSalary(normalizeJob({ salaryMin: 0, salaryMax: 0, currency: "USD" }, "demo")), "$0 - $0");
  assert.equal(formatJobAge("not-a-date"), "unknown");
  assert.throws(() => normalizeJob({}, " "), /stable job ID/);
});

test("unknown job is visible by default but cannot satisfy explicit filters", () => {
  const job = normalizeJob({}, "demo");
  assert.equal(matchesJobFilters(job, filters), true);
  assert.equal(matchesJobFilters(job, { ...filters, search: "unknown" }), true);
  for (const filter of [{ workTypes: ["remote"] }, { jobTypes: ["full-time"] }, { experienceLevels: ["senior"] }, { salaryMin: 50000 }, { sources: ["Indeed"] }]) {
    assert.equal(matchesJobFilters(job, { ...filters, ...filter }), false);
  }
});
