import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import {
  Job,
  UserProfile,
  Filters,
  DEFAULT_FILTERS,
  DEFAULT_PROFILE,
} from "@/types";
import { MOCK_JOBS } from "@/mocks/jobs";
import { matchesJobFilters, normalizeJob } from "@/utils/jobs";
import {
  fetchJobs,
  isDemo,
  type JobPage,
  type JobSearch,
} from "@/services/jobApi";

const LEGACY_SAVED_KEY = "jobbo_saved_jobs";
const SAVED_SNAPSHOTS_KEY = "jobbo_saved_job_snapshots_v1";
const LAST_RESULTS_KEY = "jobbo_last_job_results_v1";
const PROFILE_KEY = "jobbo_profile";
const EMPTY_JOBS: Job[] = [];

// A shared queue also orders writes across provider remounts.
let storageWrites: Promise<void> = Promise.resolve();
function writeSnapshot(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  const write = storageWrites.then(() => AsyncStorage.setItem(key, json));
  storageWrites = write.catch(() => {});
  return write;
}

function readJobs(stored: string | null): Job[] {
  if (!stored) return [];
  const value: unknown = JSON.parse(stored);
  if (!Array.isArray(value)) throw new Error("Invalid stored job snapshots");
  return value.flatMap((raw: unknown) => {
    if (
      !raw ||
      typeof raw !== "object" ||
      !("id" in raw) ||
      typeof raw.id !== "string" ||
      !raw.id.trim()
    )
      return [];
    // Preserve optional model fields while validating the core snapshot.
    return [{ ...raw, ...normalizeJob(raw, raw.id) } as Job];
  });
}

function uniqueJobs(jobs: Job[]): Job[] {
  return [...new Map(jobs.map((job) => [job.id, job])).values()];
}

export const [JobProvider, useJobs] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const savedRef = useRef<Job[]>([]);
  const [lastResults, setLastResults] = useState<Job[]>([]);
  const receivedLiveResults = useRef(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const profileEdited = useRef(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [request, setRequest] = useState<JobSearch | null>(null);
  const [fetchSubmittedSearch, setFetchSubmittedSearch] = useState(false);
  const activeRequest = useRef<JobSearch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydrated = useRef(false);
  const pendingToggles = useRef<{ id: string; job?: Job }[]>([]);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const reportPersistenceError = useCallback((error: unknown) => {
    console.warn("JOBBO storage:", error);
    setPersistenceError(
      "Could not read or save local data. Changes may not survive a restart.",
    );
  }, []);
  const persist = useCallback(
    (key: string, value: unknown) => {
      void writeSnapshot(key, value).catch(reportPersistenceError);
    },
    [reportPersistenceError],
  );

  const search = useInfiniteQuery({
    queryKey: ["jobs", "search", request],
    queryFn: ({ pageParam, signal }) => {
      if (!request) throw new Error("Submit a job search first.");
      return fetchJobs(request, pageParam, signal);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage, _pages, _lastParam, params) =>
      lastPage.nextCursor && !params.includes(lastPage.nextCursor)
        ? lastPage.nextCursor
        : undefined,
    enabled: !isDemo && !!request?.query && fetchSubmittedSearch,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 15 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const jobs = useMemo(
    () =>
      isDemo
        ? MOCK_JOBS
        : request && search.data
          ? uniqueJobs(search.data.pages.flatMap((page) => page.jobs))
          : EMPTY_JOBS,
    [request, search.data],
  );

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      // Finish any writes from a previous mounted provider before reading.
      await storageWrites;
      const read = async (key: string) => {
        try {
          return await AsyncStorage.getItem(key);
        } catch (error) {
          if (!disposed) reportPersistenceError(error);
          return null;
        }
      };
      const [storedSaved, legacy, storedLast, storedProfile] =
        await Promise.all([
          read(SAVED_SNAPSHOTS_KEY),
          read(LEGACY_SAVED_KEY),
          read(LAST_RESULTS_KEY),
          read(PROFILE_KEY),
        ]);
      if (disposed) return;
      let restored: Job[] = [];
      try {
        if (storedSaved !== null) restored = readJobs(storedSaved);
        else if (legacy) {
          const ids: unknown = JSON.parse(legacy);
          if (!Array.isArray(ids)) throw new Error("Invalid legacy saved jobs");
          restored = MOCK_JOBS.filter((job) => ids.includes(job.id));
        }
      } catch (error) {
        reportPersistenceError(error);
      }
      for (const { id, job } of pendingToggles.current) {
        restored = restored.some((item) => item.id === id)
          ? restored.filter((item) => item.id !== id)
          : job
            ? [...restored, job]
            : restored;
      }
      const hadPendingToggles = pendingToggles.current.length > 0;
      pendingToggles.current = [];
      savedRef.current = uniqueJobs(restored);
      setSavedJobs(savedRef.current);
      hydrated.current = true;
      if ((storedSaved === null && legacy !== null) || hadPendingToggles) {
        persist(SAVED_SNAPSHOTS_KEY, savedRef.current);
      }
      try {
        // A completed live search takes precedence over delayed disk hydration.
        if (!receivedLiveResults.current) setLastResults(readJobs(storedLast));
      } catch (error) {
        reportPersistenceError(error);
      }
      try {
        if (storedProfile && !profileEdited.current) {
          const stored: unknown = JSON.parse(storedProfile);
          if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
            throw new Error("Invalid stored profile");
          }
          const next = { ...DEFAULT_PROFILE, ...stored } as UserProfile;
          next.firstName =
            typeof next.firstName === "string" ? next.firstName : "";
          setProfile(next);
        }
      } catch (error) {
        reportPersistenceError(error);
      }
      setIsLoading(false);
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [persist, reportPersistenceError]);

  useEffect(() => {
    // Never persist a previous query's result after the next submit has started.
    if (isDemo || !request || request !== activeRequest.current || !search.data)
      return;
    receivedLiveResults.current = true;
    setLastResults(jobs);
    persist(LAST_RESULTS_KEY, jobs);
  }, [request, search.data, jobs, persist]);

  const refreshJobs = useCallback(() => {
    const current = activeRequest.current;
    if (isDemo || !current || current !== request) return;
    const queryKey = ["jobs", "search", current];
    // Read the cache synchronously: two submissions can precede a React render.
    if (queryClient.getQueryState(queryKey)?.fetchStatus === "fetching") return;
    queryClient.setQueryData<InfiniteData<JobPage, string | null>>(
      queryKey,
      (data) =>
        data
          ? {
              pages: data.pages.slice(0, 1),
              pageParams: data.pageParams.slice(0, 1),
            }
          : undefined,
    );
    void search.refetch({ cancelRefetch: false });
  }, [queryClient, request, search]);

  const searchJobs = useCallback(
    (query: string, location: string, remoteOnly: boolean) => {
      const next = {
        query: query.trim(),
        location: location.trim(),
        remoteOnly,
      };
      if (!next.query) return;
      if (isDemo)
        setFilters((previous) => ({ ...previous, search: next.query }));
      const current = activeRequest.current;
      // Re-submission reuses even stale cached results; refresh is always explicit.
      if (
        current &&
        current.query === next.query &&
        current.location === next.location &&
        current.remoteOnly === next.remoteOnly
      ) {
        if (
          queryClient.getQueryState(["jobs", "search", current])?.status ===
          "error"
        ) {
          refreshJobs();
        }
        return;
      }
      activeRequest.current = next;
      setFetchSubmittedSearch(
        !queryClient.getQueryData(["jobs", "search", next]),
      );
      setRequest(next);
    },
    [queryClient, refreshJobs],
  );

  const getJob = useCallback(
    (id: string): Job | undefined =>
      jobs.find((job) => job.id === id) ??
      savedJobs.find((job) => job.id === id) ??
      lastResults.find((job) => job.id === id),
    [jobs, savedJobs, lastResults],
  );

  const toggleSaved = useCallback(
    (id: string) => {
      const current = savedRef.current;
      const job = getJob(id);
      if (!hydrated.current) pendingToggles.current.push({ id, job });
      const next = current.some((item) => item.id === id)
        ? current.filter((item) => item.id !== id)
        : job
          ? [...current, job]
          : current;
      savedRef.current = next;
      setSavedJobs(next);
      if (hydrated.current) persist(SAVED_SNAPSHOTS_KEY, next);
    },
    [getJob, persist],
  );

  const savedIds = useMemo(() => savedJobs.map((job) => job.id), [savedJobs]);
  const isSaved = useCallback(
    (id: string) => savedIds.includes(id),
    [savedIds],
  );
  const updateProfile = useCallback(
    (next: UserProfile) => {
      profileEdited.current = true;
      const normalized = {
        ...DEFAULT_PROFILE,
        ...next,
        firstName: next.firstName ?? "",
      };
      setProfile(normalized);
      persist(PROFILE_KEY, normalized);
    },
    [persist],
  );

  const filteredJobs = useMemo(() => {
    const localFilters = isDemo ? filters : { ...filters, search: "" };
    return jobs.filter(
      (job) =>
        matchesJobFilters(job, localFilters) &&
        (!isDemo || !request?.remoteOnly || job.workType === "remote") &&
        (!isDemo ||
          !request?.location ||
          job.location.toLowerCase().includes(request.location.toLowerCase())),
    );
  }, [jobs, filters, request]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.workTypes.length > 0) count++;
    if (filters.jobTypes.length > 0) count++;
    if (filters.experienceLevels.length > 0) count++;
    if (filters.salaryMin > 0 || filters.salaryMax < 300000) count++;
    if (filters.sources.length > 0) count++;
    return count;
  }, [filters]);

  const loadMore = useCallback(() => {
    if (!isDemo && request && search.hasNextPage && !search.isFetching) {
      void search.fetchNextPage();
    }
  }, [request, search]);

  return {
    jobs: filteredJobs,
    allJobs: jobs,
    savedJobs,
    savedIds,
    profile,
    filters,
    activeFilterCount,
    toggleSaved,
    isSaved,
    updateProfile,
    setFilters,
    getJob,
    isLoading,
    searchJobs,
    hasSearched: request !== null,
    isSearching:
      !isDemo &&
      request !== null &&
      search.isFetching &&
      !search.isFetchingNextPage,
    isFetchingNextPage: !isDemo && search.isFetchingNextPage,
    searchError: !isDemo && search.error ? search.error.message : null,
    hasNextPage: !isDemo && !!search.hasNextPage,
    loadMore,
    refreshJobs,
    isDemo,
    persistenceError,
  };
});

export function useJobById(id: string) {
  const { getJob, isSaved, toggleSaved, isLoading } = useJobs();
  const job = useMemo(() => getJob(id), [getJob, id]);
  const saved = isSaved(id);
  const toggle = useCallback(() => toggleSaved(id), [toggleSaved, id]);
  return { job, saved, toggle, isLoading };
}
