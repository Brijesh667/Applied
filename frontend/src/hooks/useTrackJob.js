import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

/**
 * Custom hook to track a job posting into an Application.
 * Handles 201 (created) and 409 (already tracked conflict) identically by updating
 * the React Query search cache for the resume with trackedApplicationId.
 */
export function useTrackJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resumeId, jobId }) => {
      try {
        const res = await jobsApi.track({ resumeId, jobId });
        return {
          application: res?.application,
          applicationId: res?.application?._id || res?.application?.id,
          alreadyTracked: false,
          resumeId,
          jobId,
        };
      } catch (err) {
        if (err.status === 409) {
          const applicationId = err.applicationId || err.data?.applicationId;
          return {
            application: null,
            applicationId,
            alreadyTracked: true,
            resumeId,
            jobId,
          };
        }
        throw err;
      }
    },
    retry: false,
    onSuccess: (result) => {
      const { resumeId, jobId, applicationId } = result;

      if (resumeId && jobId && applicationId) {
        // Update cached search results for this resume
        const searchKey = queryKeys.jobs.search(resumeId);
        queryClient.setQueryData(searchKey, (oldData) => {
          if (!oldData || !Array.isArray(oldData.jobs)) return oldData;
          return {
            ...oldData,
            jobs: oldData.jobs.map((job) =>
              job.id === jobId
                ? { ...job, trackedApplicationId: applicationId }
                : job
            ),
          };
        });
      }

      // Invalidate applications lists, details, and stats
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export default useTrackJob;
