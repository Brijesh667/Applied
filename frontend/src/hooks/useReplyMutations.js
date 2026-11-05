import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { applicationsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

export function useReplyMutations(applicationId) {
  const queryClient = useQueryClient();

  // Add reply
  const addReplyMutation = useMutation({
    mutationFn: (body) => applicationsApi.addReply(applicationId, body),
    onSuccess: (updatedApp) => {
      queryClient.setQueryData(
        queryKeys.applications.detail(applicationId),
        updatedApp
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      toast.success("Reply added");
    },
  });

  // Update reply
  const updateReplyMutation = useMutation({
    mutationFn: ({ replyId, body }) =>
      applicationsApi.updateReply(applicationId, replyId, body),
    onSuccess: (updatedApp) => {
      queryClient.setQueryData(
        queryKeys.applications.detail(applicationId),
        updatedApp
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      toast.success("Reply saved");
    },
  });

  // Delete reply
  const deleteReplyMutation = useMutation({
    mutationFn: (replyId) =>
      applicationsApi.deleteReply(applicationId, replyId),
    onSuccess: (updatedApp) => {
      queryClient.setQueryData(
        queryKeys.applications.detail(applicationId),
        updatedApp
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      toast.success("Reply deleted");
    },
  });

  // Optimistic Toggle Completed
  const toggleCompleteMutation = useMutation({
    mutationFn: ({ replyId, completed }) =>
      applicationsApi.updateReply(applicationId, replyId, { completed }),
    onMutate: async ({ replyId, completed }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.applications.detail(applicationId),
      });

      const previous = queryClient.getQueryData(
        queryKeys.applications.detail(applicationId)
      );

      if (previous && Array.isArray(previous.replies)) {
        const updatedReplies = previous.replies.map((r) =>
          r._id === replyId ? { ...r, completed } : r
        );
        queryClient.setQueryData(
          queryKeys.applications.detail(applicationId),
          { ...previous, replies: updatedReplies }
        );
      }

      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.applications.detail(applicationId),
          context.previous
        );
      }
      toast.error("Couldn't update the reply. Try again.");
    },
    onSuccess: (updatedApp) => {
      queryClient.setQueryData(
        queryKeys.applications.detail(applicationId),
        updatedApp
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });

  return {
    addReply: addReplyMutation.mutateAsync,
    isAdding: addReplyMutation.isPending,
    addError: addReplyMutation.error,

    updateReply: updateReplyMutation.mutateAsync,
    isUpdating: updateReplyMutation.isPending,
    updateError: updateReplyMutation.error,

    deleteReply: deleteReplyMutation.mutateAsync,
    isDeleting: deleteReplyMutation.isPending,
    deleteError: deleteReplyMutation.error,

    toggleComplete: toggleCompleteMutation.mutateAsync,
    isToggling: toggleCompleteMutation.isPending,
  };
}

export default useReplyMutations;
