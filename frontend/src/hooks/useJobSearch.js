import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { jobsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";
import { JOB_PAGE_SIZE } from "../lib/constants.js";

/**
 * Hook to retrieve the user's latest unexpired search for a resume.
 * Treats 404 as "no saved search" (data = null, isError = false).
 *
 * @param {string} resumeId
 */
export function useLatestSearch(resumeId) {
  return useQuery({
    queryKey: queryKeys.jobs.latest(resumeId),
    queryFn: async () => {
      if (!resumeId) return null;
      try {
        const res = await jobsApi.getLatest(resumeId);
        return res;
      } catch (err) {
        if (err?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(resumeId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation hook to execute a fresh search or refresh.
 * On success, updates jobs.latest(resumeId) and seeds jobs.results(searchId, { sort: "best" })
 * as an infinite query page so page 1 needs zero follow-up requests.
 */
export function useRunJobSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resumeId, filters, refresh = false }) => {
      if (!resumeId) {
        throw new Error("Resume ID is required to search jobs");
      }
      return jobsApi.search({ resumeId, filters, refresh });
    },
    retry: false,
    onSuccess: (data, variables) => {
      const resumeId = variables?.resumeId || data?.search?.resumeId;
      if (resumeId) {
        queryClient.setQueryData(queryKeys.jobs.latest(resumeId), data);
      }
      const searchId = data?.search?.id;
      if (searchId) {
        // Seed initial page for sort: "best"
        const initialPage = {
          jobs: data.jobs || [],
          total: data.total ?? (data.jobs || []).length,
          page: data.page || 1,
          limit: data.limit || JOB_PAGE_SIZE,
          hasMore: Boolean(data.hasMore),
          facets: data.facets || {},
          search: data.search,
        };
        queryClient.setQueryData(
          queryKeys.jobs.results(searchId, { sort: "best" }),
          {
            pages: [initialPage],
            pageParams: [1],
          }
        );
      }
    },
  });
}

/**
 * Infinite query hook for reading paged & sorted results of a stored search.
 * Retains previous results during sort transitions (placeholderData).
 * Fails gracefully without retries on 404 (expired search).
 *
 * @param {string} searchId
 * @param {Object} [options]
 * @param {"best" | "newest"} [options.sort="best"]
 */
export function useJobResults(searchId, { sort = "best" } = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.results(searchId, { sort }),
    queryFn: async ({ pageParam = 1 }) => {
      if (!searchId) {
        return {
          jobs: [],
          total: 0,
          page: 1,
          limit: JOB_PAGE_SIZE,
          hasMore: false,
          facets: {},
          search: null,
        };
      }
      return jobsApi.getSearchJobs(searchId, {
        page: pageParam,
        limit: JOB_PAGE_SIZE,
        sort,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasMore) return undefined;
      const currentPage = lastPage.page || 1;
      return currentPage + 1;
    },
    enabled: Boolean(searchId),
    retry: (failureCount, error) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });
}

export default {
  useLatestSearch,
  useRunJobSearch,
  useJobResults,
};
