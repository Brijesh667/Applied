import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useSaveApplication() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (body) => applicationsApi.create(body),
    onSuccess: (savedApp) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      queryClient.setQueryData(
        queryKeys.applications.detail(savedApp._id),
        savedApp
      );
      toast.success("Application saved");
      navigate(`/applications/${savedApp._id}`, { replace: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => applicationsApi.update(id, body),
    onSuccess: (savedApp) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      queryClient.setQueryData(
        queryKeys.applications.detail(savedApp._id),
        savedApp
      );
      toast.success("Changes saved");
      navigate(`/applications/${savedApp._id}`, { replace: true });
    },
  });

  return {
    createApplication: createMutation.mutateAsync,
    updateApplication: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isSaving: createMutation.isPending || updateMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
  };
}

export default useSaveApplication;
