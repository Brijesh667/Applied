import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resumesApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useUpdateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }) => resumesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all });
    },
  });
}

export default useUpdateResume;
