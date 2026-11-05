import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (id) => applicationsApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: queryKeys.applications.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      toast.success("Application deleted");
      navigate("/applications", { replace: true });
    },
  });

  return {
    deleteApplication: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}

export default useDeleteApplication;
