import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resumesApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useReparseResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => resumesApi.reparse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all });
    },
  });
}

export default useReparseResume;
