import { useQuery } from "@tanstack/react-query";
import { applicationsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useApplication(id) {
  return useQuery({
    queryKey: queryKeys.applications.detail(id),
    queryFn: () => applicationsApi.get(id),
    enabled: Boolean(id),
  });
}

export default useApplication;
