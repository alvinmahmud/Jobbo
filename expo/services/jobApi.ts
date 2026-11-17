import { Platform } from "react-native";
import type { Job } from "@/types";
import { normalizeJSearchJob } from "@/utils/jsearch";

export const isDemo = process.env.EXPO_PUBLIC_JOB_SOURCE === "demo";

export interface JobSearch {
  query: string;
  location: string;
  remoteOnly: boolean;
}

export interface JobPage {
  jobs: Job[];
  nextCursor: string | null;
}

function apiUrl(): URL {
  let base = process.env.EXPO_PUBLIC_JOBS_API_URL?.trim();
  if (!base && Platform.OS === "web" && typeof window !== "undefined") {
    const origin = new URL(window.location.href);
    origin.port = "8787";
    origin.pathname = "/";
    origin.search = "";
    origin.hash = "";
    base = origin.href;
  }
  if (!base) {
    throw new Error(
      "Set EXPO_PUBLIC_JOBS_API_URL to your jobs server URL (for example http://192.168.1.10:8787 on a physical device), then restart Expo.",
    );
  }
  try {
    const url = new URL(`${base.replace(/\/+$/, "")}/api/jobs`);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url;
  } catch {
    throw new Error(
      "EXPO_PUBLIC_JOBS_API_URL must be an HTTP or HTTPS server base URL.",
    );
  }
}

export async function fetchJobs(
  search: JobSearch,
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<JobPage> {
  const url = apiUrl();
  url.searchParams.set("query", search.query.trim());
  url.searchParams.set("location", search.location.trim());
  url.searchParams.set("remote", String(search.remoteOnly));
  if (cursor) url.searchParams.set("cursor", cursor);

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 20_000);
  try {
    const response = await fetch(url.href, { signal: controller.signal });
    const body: unknown = await response.json();
    const envelope =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;
    if (!response.ok || envelope?.error) {
      const error = envelope?.error;
      const message =
        typeof error === "string"
          ? error
          : error &&
              typeof error === "object" &&
              "message" in error &&
              typeof error.message === "string"
            ? error.message
            : null;
      throw new Error(
        message ?? `Job search failed (HTTP ${response.status}).`,
      );
    }
    if (
      !envelope ||
      !Array.isArray(envelope.jobs) ||
      !(
        envelope.nextCursor === null ||
        (typeof envelope.nextCursor === "string" &&
          envelope.nextCursor.trim().length > 0)
      )
    ) {
      throw new Error("The jobs server returned an invalid response.");
    }
    const jobs = envelope.jobs
      .map(normalizeJSearchJob)
      .filter((job): job is Job => job !== null);
    return { jobs, nextCursor: envelope.nextCursor as string | null };
  } catch (error) {
    if (timedOut)
      throw new Error(
        "Job search timed out after 20 seconds. Please try again.",
      );
    if (signal?.aborted) throw error;
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach the jobs server. Check EXPO_PUBLIC_JOBS_API_URL and your connection.",
      );
    }
    if (error instanceof SyntaxError)
      throw new Error("The jobs server returned invalid JSON.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
