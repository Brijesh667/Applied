import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resumesApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useUploadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => resumesApi.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all });
    },
  });
}

export default useUploadResume;
