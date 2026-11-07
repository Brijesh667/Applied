import { useQuery } from "@tanstack/react-query";
import { resumesApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useResumes(options = {}) {
  return useQuery({
    queryKey: queryKeys.resumes.list(),
    queryFn: async () => {
      const res = await resumesApi.list();
      return res;
    },
    refetchInterval: (query) => {
      const resumes = query.state.data?.resumes || [];
      const hasPending = resumes.some((r) => r.parseStatus === "pending");
      return hasPending ? 3000 : false;
    },
    ...options,
  });
}

export default useResumes;
