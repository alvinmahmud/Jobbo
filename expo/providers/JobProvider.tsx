import React, { useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import {
  Job,
  UserProfile,
  Filters,
  DEFAULT_FILTERS,
  DEFAULT_PROFILE,
} from "@/types";
import { MOCK_JOBS } from "@/mocks/jobs";
import { matchesJobFilters } from "@/utils/jobs";

const SAVED_JOBS_KEY = "jobbo_saved_jobs";
const PROFILE_KEY = "jobbo_profile";

export const [JobProvider, useJobs] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const savedQuery = useQuery({
    queryKey: ["savedJobs"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SAVED_JOBS_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    },
  });

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      return stored
        ? ({ ...DEFAULT_PROFILE, ...JSON.parse(stored) } as UserProfile)
        : DEFAULT_PROFILE;
    },
  });

  useEffect(() => {
    if (savedQuery.data) {
      setSavedIds(savedQuery.data);
    }
  }, [savedQuery.data]);

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await AsyncStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(ids));
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.setQueryData(["savedJobs"], ids);
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (p: UserProfile) => {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      return p;
    },
    onSuccess: (p) => {
      queryClient.setQueryData(["profile"], p);
    },
  });

  const toggleSaved = useCallback(
    (jobId: string) => {
      setSavedIds((prev) => {
        const next = prev.includes(jobId)
          ? prev.filter((id) => id !== jobId)
          : [...prev, jobId];
        saveMutation.mutate(next);
        return next;
      });
    },
    [saveMutation],
  );

  const isSaved = useCallback(
    (jobId: string) => savedIds.includes(jobId),
    [savedIds],
  );

  const updateProfile = useCallback(
    (p: UserProfile) => {
      setProfile(p);
      profileMutation.mutate(p);
    },
    [profileMutation],
  );

  const jobs = MOCK_JOBS;

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => matchesJobFilters(job, filters));
  }, [jobs, filters]);

  const savedJobs = useMemo(() => {
    return jobs.filter((job) => savedIds.includes(job.id));
  }, [jobs, savedIds]);

  const getJob = useCallback(
    (id: string): Job | undefined => jobs.find((j) => j.id === id),
    [jobs],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.workTypes.length > 0) count++;
    if (filters.jobTypes.length > 0) count++;
    if (filters.experienceLevels.length > 0) count++;
    if (filters.salaryMin > 0 || filters.salaryMax < 300000) count++;
    if (filters.sources.length > 0) count++;
    return count;
  }, [filters]);

  return useMemo(
    () => ({
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
      isLoading: savedQuery.isLoading || profileQuery.isLoading,
    }),
    [
      filteredJobs,
      jobs,
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
      savedQuery.isLoading,
      profileQuery.isLoading,
    ],
  );
});

export function useJobById(id: string) {
  const { getJob, isSaved, toggleSaved } = useJobs();
  const job = useMemo(() => getJob(id), [getJob, id]);
  const saved = isSaved(id);
  const toggle = useCallback(() => toggleSaved(id), [toggleSaved, id]);
  return { job, saved, toggle };
}
