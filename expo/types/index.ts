export type WorkType = "remote" | "hybrid" | "onsite";
export type JobType = "full-time" | "part-time" | "contract" | "internship";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  workType: WorkType | "unknown";
  jobType: JobType | "unknown";
  experienceLevel: ExperienceLevel | "unknown";
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  description: string;
  requirements: string[];
  skills: string[];
  source: string;
  sourceUrl: string;
  postedAt: string;
  isNew: boolean;
}

export interface UserProfile {
  firstName: string;
  jobTitle: string;
  skills: string[];
  location: string;
  experienceLevel: ExperienceLevel;
  preferredWorkType: WorkType[];
  preferredJobType: JobType[];
  salaryExpectation: number;
  resumeText: string;
}

export interface Filters {
  search: string;
  workTypes: WorkType[];
  jobTypes: JobType[];
  experienceLevels: ExperienceLevel[];
  salaryMin: number;
  salaryMax: number;
  sources: string[];
}

export const DEFAULT_FILTERS: Filters = {
  search: "",
  workTypes: [],
  jobTypes: [],
  experienceLevels: [],
  salaryMin: 0,
  salaryMax: 300000,
  sources: [],
};

export const DEFAULT_PROFILE: UserProfile = {
  firstName: "",
  jobTitle: "",
  skills: [],
  location: "",
  experienceLevel: "mid",
  preferredWorkType: [],
  preferredJobType: [],
  salaryExpectation: 0,
  resumeText: "",
};
