import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

/**
 * useJobSearch hook
 * Retains job search results per resumeId across session navigation.
 * Uses a mutation to trigger search/refresh, caching the response in react-query,
 * and a disabled query with staleTime: Infinity to read the cached data without auto-fetching.
 */
export function useJobSearch(resumeId) {
  const queryClient = useQueryClient();

  const queryKey = queryKeys.jobs.search(resumeId);

  // Cached data reader (never auto-fetches or polls)
  const query = useQuery({
    queryKey,
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
  });

  // Search mutation (calls POST /api/jobs/search)
  const mutation = useMutation({
    mutationFn: async ({ refresh = false } = {}) => {
      if (!resumeId) {
        throw new Error("Resume ID is required to search jobs");
      }
      return jobsApi.search({ resumeId, refresh });
    },
    retry: false,
    onSuccess: (data) => {
      if (resumeId) {
        queryClient.setQueryData(queryKey, data);
      }
    },
  });

  return {
    data: query.data ?? null,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    search: mutation.mutateAsync,
    searchSync: mutation.mutate,
    reset: mutation.reset,
  };
}

export default useJobSearch;
