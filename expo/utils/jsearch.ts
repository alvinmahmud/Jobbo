import type { Job } from "@/types";
import { normalizeJob } from "./jobs";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// Provider IDs can contain slashes, padding, and other route-unsafe characters.
function stableId(value: string): string {
  return `jsearch-${value
    .split("")
    .map((char) => char.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("")}`;
}

export function normalizeJSearchJob(input: unknown): Job | null {
  const raw = record(input);
  if (typeof raw.job_id !== "string" || !raw.job_id.trim()) return null;
  const highlights = record(raw.job_highlights);
  const employment = Array.isArray(raw.job_employment_types)
    ? raw.job_employment_types[0]
    : raw.job_employment_type;
  const jobType =
    typeof employment === "string"
      ? {
          FULLTIME: "full-time",
          "FULL-TIME": "full-time",
          CONTRACTOR: "contract",
          CONTRACT: "contract",
          PARTTIME: "part-time",
          "PART-TIME": "part-time",
          INTERN: "internship",
          INTERNSHIP: "internship",
        }[employment.toUpperCase()]
      : undefined;
  const workArrangement =
    typeof raw.work_arrangement === "string"
      ? raw.work_arrangement.toLowerCase()
      : "";
  // false only rules out fully remote; it does not prove on-site vs hybrid.
  const workType = ["remote", "hybrid", "onsite"].includes(workArrangement)
    ? workArrangement
    : workArrangement === "on-site"
      ? "onsite"
      : raw.job_is_remote === true
        ? "remote"
        : undefined;
  const period =
    typeof raw.job_salary_period === "string"
      ? raw.job_salary_period.toLowerCase()
      : "unknown";
  const location =
    typeof raw.job_location === "string" && raw.job_location.trim()
      ? raw.job_location
      : [raw.job_city, raw.job_state, raw.job_country]
          .filter((part) => typeof part === "string" && part.trim())
          .join(", ");
  const postedAt = raw.job_posted_at_datetime_utc;
  const timestamp = typeof postedAt === "string" ? Date.parse(postedAt) : NaN;
  const ageMs = Date.now() - timestamp;
  return normalizeJob(
    {
      title: raw.job_title,
      company: raw.employer_name,
      companyLogo: raw.employer_logo,
      location,
      workType,
      jobType,
      experienceLevel: raw.seniority_level,
      salaryMin: raw.job_min_salary,
      salaryMax: raw.job_max_salary,
      currency: raw.job_salary_currency,
      salaryPeriod: period,
      description: raw.job_description,
      requirements: highlights.Qualifications,
      skills: raw.required_technologies,
      source: raw.job_publisher,
      sourceUrl: raw.job_apply_link,
      postedAt,
      isNew: Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 3 * 86400000,
    },
    stableId(raw.job_id),
  );
}
