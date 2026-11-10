import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "../api/endpoints.js";
import { queryKeys } from "../api/queryKeys.js";

/**
 * Custom hook to track a job posting into an Application.
 * Handles 201 (created) and 409 (already tracked conflict) identically by updating
 * all cached pages of jobs.results and jobs.latest with trackedApplicationId.
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
      const { jobId, applicationId } = result;

      if (jobId && applicationId) {
        // Update every cached page in jobs.results infinite queries
        queryClient.setQueriesData(
          { queryKey: ["jobs", "results"] },
          (oldData) => {
            if (!oldData || !Array.isArray(oldData.pages)) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                jobs: Array.isArray(page?.jobs)
                  ? page.jobs.map((job) =>
                      job.id === jobId
                        ? { ...job, trackedApplicationId: applicationId }
                        : job
                    )
                  : page?.jobs,
              })),
            };
          }
        );

        // Also update jobs.latest in case it is loaded
        queryClient.setQueriesData(
          { queryKey: ["jobs", "latest"] },
          (oldData) => {
            if (!oldData || !Array.isArray(oldData.jobs)) return oldData;
            return {
              ...oldData,
              jobs: oldData.jobs.map((job) =>
                job.id === jobId
                  ? { ...job, trackedApplicationId: applicationId }
                  : job
              ),
            };
          }
        );
      }

      // Invalidate applications lists, details, and stats
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export default useTrackJob;
