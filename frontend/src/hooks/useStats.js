import { useQuery } from "@tanstack/react-query";
import { statsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => statsApi.get(),
  });
}

export default useStats;
