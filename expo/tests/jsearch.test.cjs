const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");
const { normalizeJSearchJob } = load("utils/jsearch.ts");
const { formatJobSalary, matchesJobFilters } = load("utils/jobs.ts");
const defaults = { search: "", workTypes: [], jobTypes: [], experienceLevels: [], salaryMin: 0, salaryMax: 300000, sources: [] };
const sample = { job_id: "abc/=?+", job_title: "Engineer", employer_name: "Example", job_location: "Austin, TX", job_country: "US", job_employment_types: ["FULLTIME"], job_is_remote: false, job_description: "Build things.", job_apply_link: "https://example.com/apply", job_publisher: "Indeed", job_posted_at_datetime_utc: new Date().toISOString(), job_min_salary: 50, job_max_salary: 70, job_salary_currency: "USD", job_salary_period: "HOUR" };

test("adapter maps real provider fields with stable route-safe identities", () => {
  const job = normalizeJSearchJob(sample);
  assert.equal(job.title, "Engineer");
  assert.equal(job.company, "Example");
  assert.equal(job.source, "Indeed");
  assert.equal(job.jobType, "full-time");
  assert.match(job.id, /^jsearch-[a-f0-9]+$/);
  assert.equal(normalizeJSearchJob(sample).id, job.id);
  assert.notEqual(normalizeJSearchJob({ ...sample, job_id: "different" }).id, job.id);
  assert.equal(job.isNew, true);
  assert.equal(job.workType, "unknown");
  assert.equal(job.salaryPeriod, "hour");
  assert.equal(formatJobSalary(job, true), "$50 - $70/hr");
});

test("adapter does not invent a location, salary currency, work arrangement, or date", () => {
  const job = normalizeJSearchJob({ job_id: "empty" });
  assert.equal(job.location, "unknown");
  assert.equal(job.currency, "unknown");
  assert.equal(job.salaryPeriod, "unknown");
  assert.equal(job.workType, "unknown");
  assert.equal(job.isNew, false);
  assert.deepEqual(job.skills, ["unknown"]);
  assert.equal(normalizeJSearchJob({}), null);
  assert.equal(normalizeJSearchJob(null), null);
  assert.equal(normalizeJSearchJob({ job_id: " " }), null);
});

test("explicit work arrangements and qualification arrays survive", () => {
  const job = normalizeJSearchJob({ ...sample, work_arrangement: "hybrid", required_technologies: ["React"], job_highlights: { Qualifications: ["TypeScript experience"] }, seniority_level: "senior" });
  assert.equal(job.workType, "hybrid");
  assert.equal(job.experienceLevel, "senior");
  assert.deepEqual(job.requirements, ["TypeScript experience"]);
  assert.deepEqual(job.skills, ["React"]);
  assert.equal(normalizeJSearchJob({ ...sample, job_is_remote: true }).workType, "remote");
});

test("salary filters are annual USD only; hourly/monthly pay is never mislabeled", () => {
  const hourly = normalizeJSearchJob(sample);
  assert.equal(matchesJobFilters(hourly, defaults), true);
  assert.equal(matchesJobFilters(hourly, { ...defaults, salaryMin: 50000 }), false);
  const yearly = normalizeJSearchJob({ ...sample, job_salary_period: "YEAR", job_min_salary: 100000, job_max_salary: 150000 });
  assert.equal(formatJobSalary(yearly, true), "$100k - $150k/yr");
  assert.equal(matchesJobFilters(yearly, { ...defaults, salaryMin: 50000 }), true);
  const monthly = normalizeJSearchJob({ ...sample, job_salary_period: "MONTH", job_min_salary: 5000, job_max_salary: 7000 });
  assert.equal(formatJobSalary(monthly, true), "$5k - $7k/mo");
  assert.equal(formatJobSalary(normalizeJSearchJob({ ...sample, job_salary_period: null })), "unknown");
});
