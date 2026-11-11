import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resumesApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => resumesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export default useDeleteResume;
