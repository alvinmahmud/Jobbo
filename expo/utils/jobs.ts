import type { Filters, Job } from "@/types";

export const UNKNOWN = "unknown";

export const WORK_TYPE_LABELS = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unknown: UNKNOWN,
};
export const JOB_TYPE_LABELS = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
  unknown: UNKNOWN,
};
export const EXPERIENCE_LABELS = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior",
  lead: "Lead",
  executive: "Executive",
  unknown: UNKNOWN,
};

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : UNKNOWN;
}

function list(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
        .filter(
          (item): item is string => typeof item === "string" && !!item.trim(),
        )
        .map((item) => item.trim())
    : [];
  return values.length ? [...new Set(values)] : [UNKNOWN];
}

function url(value: unknown): string {
  if (typeof value !== "string") return UNKNOWN;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol)
      ? parsed.href
      : UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}

function option<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | "unknown" {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : UNKNOWN;
}

function salary(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

// API-specific adapters should map their fields here and supply a stable source ID.
// Missing or malformed content must not invent job facts or navigation identities.
export function normalizeJob(input: unknown, id: string): Job {
  if (!id.trim()) throw new Error("A stable job ID is required");
  const raw: Record<string, unknown> =
    input !== null && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  let salaryMin = salary(raw.salaryMin);
  let salaryMax = salary(raw.salaryMax);
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    salaryMin = null;
    salaryMax = null;
  }
  const postedAt = text(raw.postedAt);
  return {
    id,
    title: text(raw.title),
    company: text(raw.company),
    companyLogo: url(raw.companyLogo),
    location: text(raw.location),
    workType: option(raw.workType, ["remote", "hybrid", "onsite"] as const),
    jobType: option(raw.jobType, [
      "full-time",
      "part-time",
      "contract",
      "internship",
    ] as const),
    experienceLevel: option(raw.experienceLevel, [
      "entry",
      "mid",
      "senior",
      "lead",
      "executive",
    ] as const),
    salaryMin,
    salaryMax,
    currency: text(raw.currency),
    description: text(raw.description),
    requirements: list(raw.requirements),
    skills: list(raw.skills),
    source: text(raw.source),
    sourceUrl: url(raw.sourceUrl),
    postedAt: Number.isFinite(Date.parse(postedAt)) ? postedAt : UNKNOWN,
    isNew: raw.isNew === true,
  };
}

export function formatJobSalary(
  job: Pick<Job, "salaryMin" | "salaryMax" | "currency">,
  annual = false,
): string {
  const { salaryMin: min, salaryMax: max, currency } = job;
  if (
    min === null ||
    max === null ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min < 0 ||
    max < min ||
    currency === UNKNOWN
  )
    return UNKNOWN;
  const prefix = currency === "USD" ? "$" : `${currency} `;
  const amount = (n: number) =>
    `${prefix}${n >= 1000 ? `${Math.round(n / 1000)}k` : n}`;
  return `${amount(min)} - ${amount(max)}${annual ? "/yr" : ""}`;
}

export function formatJobAge(postedAt: string, compact = false): string {
  const timestamp = Date.parse(postedAt);
  if (!Number.isFinite(timestamp) || timestamp > Date.now()) return UNKNOWN;
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return compact ? "1d ago" : "Yesterday";
  if (days < 7) return compact ? `${days}d ago` : `${days} days ago`;
  if (days < 30)
    return compact
      ? `${Math.floor(days / 7)}w ago`
      : `${Math.floor(days / 7)} weeks ago`;
  return compact
    ? `${Math.floor(days / 30)}mo ago`
    : `${Math.floor(days / 30)} months ago`;
}

// Keep presentation copy separate from normalized values used by search and filters.
export function getJobDisplay(job: Job) {
  const salary = formatJobSalary(job);
  const age = formatJobAge(job.postedAt);
  const source = job.source === UNKNOWN ? null : job.source;
  const canApply = job.sourceUrl !== UNKNOWN;
  const type = [
    job.jobType !== UNKNOWN ? JOB_TYPE_LABELS[job.jobType] : null,
    job.workType !== UNKNOWN ? WORK_TYPE_LABELS[job.workType] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: job.title === UNKNOWN ? "Job title unavailable" : job.title,
    company: job.company === UNKNOWN ? "Company not specified" : job.company,
    location:
      job.location === UNKNOWN ? "Location not specified" : job.location,
    salary: salary === UNKNOWN ? null : salary,
    salaryAnnual:
      salary === UNKNOWN ? "Salary not disclosed" : formatJobSalary(job, true),
    workType: job.workType === UNKNOWN ? null : WORK_TYPE_LABELS[job.workType],
    type: type || "Type not specified",
    experience:
      job.experienceLevel === UNKNOWN
        ? "Experience level not specified"
        : EXPERIENCE_LABELS[job.experienceLevel],
    date: age === UNKNOWN ? "Date not available" : `Posted ${age}`,
    cardDate:
      age === UNKNOWN ? "Date not available" : formatJobAge(job.postedAt, true),
    description:
      job.description === UNKNOWN
        ? "No description available."
        : job.description,
    requirements: job.requirements.filter((value) => value !== UNKNOWN),
    skills: job.skills.filter((value) => value !== UNKNOWN),
    source,
    canApply,
    applicationLabel: !canApply
      ? "Application link unavailable"
      : source
        ? `Apply on ${source}`
        : "Apply",
  };
}

export function matchesJobFilters(job: Job, filters: Filters): boolean {
  const query = filters.search.toLowerCase();
  if (
    query &&
    ![job.title, job.company, job.location, ...job.skills].some((value) =>
      value.toLowerCase().includes(query),
    )
  )
    return false;
  if (
    filters.workTypes.length &&
    (job.workType === UNKNOWN || !filters.workTypes.includes(job.workType))
  )
    return false;
  if (
    filters.jobTypes.length &&
    (job.jobType === UNKNOWN || !filters.jobTypes.includes(job.jobType))
  )
    return false;
  if (
    filters.experienceLevels.length &&
    (job.experienceLevel === UNKNOWN ||
      !filters.experienceLevels.includes(job.experienceLevel))
  )
    return false;
  const salaryFiltered = filters.salaryMin > 0 || filters.salaryMax < 300000;
  if (
    salaryFiltered &&
    (job.salaryMin === null ||
      job.salaryMax === null ||
      job.salaryMax < filters.salaryMin ||
      job.salaryMin > filters.salaryMax)
  )
    return false;
  return !filters.sources.length || filters.sources.includes(job.source);
}
