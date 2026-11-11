import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { useResumes } from "../hooks/useResumes.js";
import {
  useLatestSearch,
  useRunJobSearch,
  useJobResults,
} from "../hooks/useJobSearch.js";
import { queryKeys } from "../api/queryKeys.js";
import {
  deriveDefaultFilters,
  parseResultFilters,
  resultFiltersToParams,
  resultFiltersToUrlParams,
  countActiveResultFilters,
} from "../lib/jobFilters.js";
import { JOB_PAGE_SIZE } from "../lib/constants.js";
import { Button } from "../components/ui/Button.jsx";
import { Button as MovingBorderButton } from "../registry/aceternity-ui/moving-border.jsx";
import ButtonHoverOutline from "../registry/ui-layouts/btn-hover-outline.jsx";
import { Select } from "../components/ui/Select.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { JobCard } from "../components/jobs/JobCard.jsx";
import { JobCardSkeleton } from "../components/jobs/JobCardSkeleton.jsx";
import { JobSearchForm } from "../components/jobs/JobSearchForm.jsx";
import { ResultFilters } from "../components/jobs/ResultFilters.jsx";
import { DidYouApplyDialog } from "../components/jobs/DidYouApplyDialog.jsx";
import { usePendingApply } from "../hooks/usePendingApply.js";

/**
 * Format reset date/time into the user's local time string.
 */
function formatResetTime(resetAt) {
  if (!resetAt) return null;
  const d = new Date(resetAt);
  if (isNaN(d.getTime())) return null;
  const isToday = d.toDateString() === new Date().toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return isToday
    ? timeStr
    : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
}

/**
 * Map API error to short user-friendly messages.
 */
function mapJobSearchError(error) {
  const status = error?.status;
  if (status === 400) {
    return error?.message || "Invalid search request. Check your settings and try again.";
  }
  if (status === 404) {
    return "Resume not found.";
  }
  if (status === 429) {
    const resetTime = formatResetTime(error?.data?.resetAt);
    const msg = error?.data?.message || "Search limit reached. Please try again later.";
    return resetTime ? `${msg} Resets at ${resetTime}.` : msg;
  }
  if (status === 502 || status === 503) {
    return "Job search providers are unavailable. Try again in a few minutes.";
  }
  return error?.message || "Couldn't search for jobs right now.";
}

export default function Jobs() {
  usePageTitle("Jobs");
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlResumeId = searchParams.get("resume") || "";

  // 1. Result Filters from URL (Source of Truth)
  const resultFilters = useMemo(
    () => parseResultFilters(searchParams),
    [searchParams]
  );
  const hasActiveResultFilters = useMemo(
    () => countActiveResultFilters(resultFilters) > 0,
    [resultFilters]
  );

  // Resumes list query
  const {
    data: resumesData,
    isLoading: isResumesLoading,
    isError: isResumesError,
    error: resumesError,
    refetch: refetchResumes,
  } = useResumes();

  const resumes = resumesData?.resumes || [];

  // Determine active resume ID: URL param -> default resume -> first resume
  const activeResumeId = useMemo(() => {
    if (urlResumeId && resumes.some((r) => (r._id || r.id) === urlResumeId)) {
      return urlResumeId;
    }
    if (resumes.length > 0) {
      const defaultResume = resumes.find((r) => r.isDefault);
      return defaultResume
        ? defaultResume._id || defaultResume.id
        : resumes[0]._id || resumes[0].id;
    }
    return "";
  }, [urlResumeId, resumes]);

  // Keep URL in sync when active resume is resolved
  useEffect(() => {
    if (activeResumeId && urlResumeId !== activeResumeId) {
      setSearchParams(
        {
          resume: activeResumeId,
          ...resultFiltersToUrlParams(resultFilters),
        },
        { replace: true }
      );
    }
  }, [activeResumeId, urlResumeId, resultFilters, setSearchParams]);

  const selectedResume =
    resumes.find((r) => (r._id || r.id) === activeResumeId) || null;

  // 2. Latest unexpired search from server
  const {
    data: latestData,
    isLoading: isLatestLoading,
    isError: isLatestError,
    error: latestError,
    refetch: refetchLatest,
  } = useLatestSearch(activeResumeId);

  // 3. Mutation for executing fresh search
  const runSearchMutation = useRunJobSearch();

  // Reset mutation state when active resume changes
  useEffect(() => {
    runSearchMutation.reset();
  }, [activeResumeId]);

  // Seed infinite query cache with page 1 from latestData so zero extra round trips are needed
  useEffect(() => {
    if (latestData?.search?.id) {
      const defaultKey = queryKeys.jobs.results(latestData.search.id, {
        sort: "best",
      });
      if (!queryClient.getQueryData(defaultKey)) {
        queryClient.setQueryData(defaultKey, {
          pages: [
            {
              jobs: latestData.jobs || [],
              total: latestData.total ?? (latestData.jobs || []).length,
              page: latestData.page || 1,
              limit: latestData.limit || JOB_PAGE_SIZE,
              hasMore: Boolean(latestData.hasMore),
              facets: latestData.facets || {},
              search: latestData.search,
            },
          ],
          pageParams: [1],
        });
      }
    }
  }, [latestData, queryClient]);

  // Form state
  const [formFilters, setFormFilters] = useState(() =>
    deriveDefaultFilters(selectedResume)
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastSyncedResumeRef = useRef(null);

  // Synchronize search form filters when latest search loads or resume changes
  useEffect(() => {
    if (isLatestLoading) return;
    if (lastSyncedResumeRef.current === activeResumeId && !latestData) return;

    if (latestData?.search?.filters) {
      setFormFilters(latestData.search.filters);
      setIsCollapsed(true);
      lastSyncedResumeRef.current = activeResumeId;
    } else if (latestData === null) {
      setFormFilters(deriveDefaultFilters(selectedResume));
      setIsCollapsed(false);
      lastSyncedResumeRef.current = activeResumeId;
    }
  }, [activeResumeId, latestData, isLatestLoading, selectedResume]);

  const handleSelectResume = (nextId) => {
    setSearchParams({ resume: nextId }, { replace: true });
  };

  const handleChangeFormFilter = (field, value) => {
    setFormFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetToDefaults = () => {
    setFormFilters(deriveDefaultFilters(selectedResume));
  };

  // Result filter manipulation handlers (URL is source of truth)
  const handleChangeResultFilter = useCallback(
    (field, value) => {
      const nextFilters = {
        ...resultFilters,
        [field]: value,
      };
      setSearchParams(
        {
          resume: activeResumeId,
          ...resultFiltersToUrlParams(nextFilters),
        },
        { replace: true }
      );
    },
    [resultFilters, activeResumeId, setSearchParams]
  );

  const handleClearResultFilters = useCallback(() => {
    const cleanParams = { resume: activeResumeId };
    if (resultFilters.sort === "newest") {
      cleanParams.sort = "newest";
    }
    setSearchParams(cleanParams, { replace: true });
  }, [activeResumeId, resultFilters.sort, setSearchParams]);

  // Determine current active search object
  const currentSearch =
    runSearchMutation.data?.search || latestData?.search || null;
  const searchId = currentSearch?.id || "";

  // Convert result filters into backend query params
  const apiParams = useMemo(
    () => resultFiltersToParams(resultFilters),
    [resultFilters]
  );

  // Results infinite query hook (retains previous results during filter/sort transitions)
  const {
    data: resultsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: resultsError,
  } = useJobResults(searchId, apiParams);

  // Expired search detection (404 from getSearchJobs)
  const isSearchExpired = resultsError?.status === 404;

  useEffect(() => {
    if (isSearchExpired) {
      setIsCollapsed(false);
    }
  }, [isSearchExpired]);

  // 400 error recovery
  const [filterError400, setFilterError400] = useState(false);
  useEffect(() => {
    if (resultsError?.status === 400) {
      setSearchParams({ resume: activeResumeId }, { replace: true });
      setFilterError400(true);
    }
  }, [resultsError, activeResumeId, setSearchParams]);

  // Aggregate all loaded jobs
  const allJobs = useMemo(() => {
    if (!resultsData?.pages) {
      if (
        latestData?.search?.id === searchId &&
        resultFilters.sort === "best" &&
        !hasActiveResultFilters &&
        latestData?.jobs
      ) {
        return latestData.jobs;
      }
      return [];
    }
    return resultsData.pages.flatMap((page) => page?.jobs || []);
  }, [resultsData, latestData, searchId, resultFilters.sort, hasActiveResultFilters]);

  const totalJobs =
    resultsData?.pages?.[0]?.total ??
    (!hasActiveResultFilters && latestData?.search?.id === searchId
      ? latestData?.total
      : 0) ??
    allJobs.length;

  // Focus management and screen-reader announcements
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const prevJobCountRef = useRef(allJobs.length);
  const prevApiParamsRef = useRef(apiParams);

  // Announce newly loaded jobs on "Load more"
  const handleLoadMore = async () => {
    prevJobCountRef.current = allJobs.length;
    await fetchNextPage();
  };

  useEffect(() => {
    if (allJobs.length > prevJobCountRef.current && prevJobCountRef.current > 0) {
      const diff = allJobs.length - prevJobCountRef.current;
      setLiveAnnouncement(`${diff} more jobs loaded`);
      const firstNewJob = allJobs[prevJobCountRef.current];
      if (firstNewJob) {
        requestAnimationFrame(() => {
          const cardEl = document.getElementById(`job-card-${firstNewJob.id}`);
          if (cardEl) {
            cardEl.focus({ preventScroll: false });
          }
        });
      }
      prevJobCountRef.current = allJobs.length;
    }
  }, [allJobs]);

  // Screen reader filter count announcements (not visible in UI)
  useEffect(() => {
    const prevStr = JSON.stringify(prevApiParamsRef.current);
    const currStr = JSON.stringify(apiParams);
    if (prevStr !== currStr) {
      prevApiParamsRef.current = apiParams;
      setLiveAnnouncement(
        `${totalJobs} ${totalJobs === 1 ? "job matches" : "jobs match"}`
      );
    }
  }, [apiParams, totalJobs]);

  // Pre-condition state evaluations
  const hasSkills = (selectedResume?.skills?.length ?? 0) > 0;
  const hasRoles = (selectedResume?.roleTitles?.length ?? 0) > 0;
  const isPending = selectedResume?.parseStatus === "pending";
  const hasSufficientCriteria = hasSkills || hasRoles;

  const isSearching = runSearchMutation.isPending;

  // Rolling 24h search quota calculation
  const quota = useMemo(() => {
    if (runSearchMutation.error?.status === 429) {
      return {
        remaining: 0,
        limit: runSearchMutation.error?.data?.limit || 5,
      };
    }
    if (typeof runSearchMutation.data?.remaining === "number") {
      return {
        remaining: runSearchMutation.data.remaining,
        limit: runSearchMutation.data.dailyLimit || 5,
      };
    }
    if (typeof latestData?.remaining === "number") {
      return {
        remaining: latestData.remaining,
        limit: latestData.dailyLimit || 5,
      };
    }
    return {
      remaining: 5,
      limit: 5,
    };
  }, [runSearchMutation.data, runSearchMutation.error, latestData]);

  // Execute search (new or refresh)
  const handleSearch = async (refresh = false) => {
    if (!selectedResume || isSearching || quota.remaining === 0) return;
    setSearchParams({ resume: activeResumeId }, { replace: true });
    setFilterError400(false);
    setIsCollapsed(true);
    try {
      const res = await runSearchMutation.mutateAsync({
        resumeId: activeResumeId,
        filters: formFilters,
        refresh,
      });
      if (res?.search?.filters) {
        setFormFilters(res.search.filters);
      }
      if (refresh && res?.cached) {
        toast("Results are still fresh");
      }
    } catch (err) {
      // Re-open form if search failed
      setIsCollapsed(false);

      if (err?.status === 429) {
        const resetStr = formatResetTime(err?.data?.resetAt);
        const msg =
          err?.data?.message ||
          "Search limit reached. Please try again later.";
        toast.error(resetStr ? `${msg} Resets at ${resetStr}.` : msg);
      }
    }
  };

  // "Did you apply?" Dialog state
  const [dialogJob, setDialogJob] = useState(null);

  usePendingApply({
    jobs: allJobs,
    isDialogOpen: Boolean(dialogJob),
    onTriggerDialog: (job) => setDialogJob(job),
  });

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
      {/* Header row: Title on left; compact resume select on right when search exists */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5">
        <h1 className="text-[26px] sm:text-[28px] font-bold text-ink tracking-tight">
          Jobs
        </h1>

        {Boolean(currentSearch) && resumes.length > 0 && (
          <div className="w-full sm:w-auto sm:min-w-[200px] max-w-xs">
            <Select
              value={activeResumeId}
              onChange={(e) => handleSelectResume(e.target.value)}
              disabled={isSearching}
              aria-label="Active resume"
              className="h-9 text-[13px]"
            >
              {resumes.map((resume) => {
                const id = resume._id || resume.id;
                const label = resume.label || resume.fileName || "Untitled resume";
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                );
              })}
            </Select>
          </div>
        )}
      </div>

      {/* Screen reader live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Loading resumes skeleton */}
      {isResumesLoading && (
        <div className="space-y-4">
          <div className="h-10 w-64 bg-sunken rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        </div>
      )}

      {/* Error loading resumes */}
      {!isResumesLoading && isResumesError && (
        <ErrorState
          title="Couldn't load resumes"
          message={resumesError?.message || "There was a problem loading your resumes."}
          onRetry={refetchResumes}
        />
      )}

      {/* Pre-condition: No resumes exist */}
      {!isResumesLoading && !isResumesError && resumes.length === 0 && (
        <EmptyState
          title="No resumes yet"
          description="Upload a resume first to find matching jobs."
          action={
            <MovingBorderButton
              as={Link}
              to="/resumes"
              duration={3000}
              containerClassName="w-44 h-9 inline-flex"
              className="text-sm font-medium text-white gap-2"
            >
              <span>Go to Resumes</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </MovingBorderButton>
          }
        />
      )}

      {/* Main view: Resumes exist */}
      {!isResumesLoading && !isResumesError && resumes.length > 0 && (
        <div className="space-y-5">
          {/* Pre-condition banner: Resume still being parsed */}
          {isPending && (
            <div
              role="status"
              className="p-3 rounded-lg bg-sunken/60 border border-rule text-[13px] leading-[18px] text-ink-soft inline-flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span>Resume is being read. Try again shortly.</span>
            </div>
          )}

          {/* Pre-condition banner: Empty skills & roles */}
          {!isPending && !hasSufficientCriteria && (
            <div
              role="status"
              className="p-3 rounded-lg bg-sunken/60 border border-rule text-[13px] leading-[18px] text-ink-soft flex items-center flex-wrap gap-1"
            >
              <AlertCircle className="w-4 h-4 text-ink-soft shrink-0" aria-hidden="true" />
              <span>Add skills or roles to this resume to find jobs.</span>
              <Link
                to="/resumes"
                className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 ml-1"
              >
                <span>Edit in Resumes</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}

          {/* Search Form Card (Expands when needed, collapses into slim summary bar) */}
          <JobSearchForm
            resumes={resumes}
            activeResumeId={activeResumeId}
            hasSearch={Boolean(currentSearch)}
            onSelectResume={handleSelectResume}
            filters={formFilters}
            onChangeFilter={handleChangeFormFilter}
            onSubmit={() => handleSearch(false)}
            onResetToDefaults={handleResetToDefaults}
            onSearchAgain={() => handleSearch(true)}
            isSearching={isSearching}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
            disabled={!hasSufficientCriteria || isPending}
            searchesRemaining={quota.remaining}
            searchesLimit={quota.limit}
            serverError={
              runSearchMutation.isError
                ? mapJobSearchError(runSearchMutation.error)
                : null
            }
          />

          {/* Quiet 400 error recovery notice */}
          {filterError400 && (
            <div
              role="status"
              className="px-3.5 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-[13px] leading-[18px] flex items-center justify-between gap-2"
            >
              <span>Filters have been reset.</span>
              <button
                type="button"
                onClick={() => setFilterError400(false)}
                className="text-danger hover:underline font-medium text-[12px] p-0.5 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Inline alert when stored search expired */}
          {isSearchExpired && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-ink space-y-2"
            >
              <div className="flex items-center gap-2 text-danger font-medium text-[14px]">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>This search has expired.</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                loading={isSearching}
                showLabelOnLoading={true}
                onClick={() => handleSearch(false)}
              >
                <span>Search again</span>
              </Button>
            </div>
          )}

          {/* Skeletons while actively searching */}
          {isSearching && (
            <div>
              <p className="sr-only" aria-live="polite">
                Searching
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
              </div>
            </div>
          )}

          {/* Initial loading of latest search */}
          {!isSearching && isLatestLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <JobCardSkeleton />
              <JobCardSkeleton />
            </div>
          )}

          {/* Error loading latest search (other than 404 which is handled gracefully) */}
          {!isSearching && !isLatestLoading && isLatestError && (
            <ErrorState
              title="Couldn't load search"
              message={latestError?.message || "There was a problem loading your saved search."}
              onRetry={refetchLatest}
            />
          )}

          {/* Search results display with ResultFilters */}
          {!isSearching &&
            !isLatestLoading &&
            !isSearchExpired &&
            currentSearch && (
              <div className="space-y-4">
                {/* Result Filters Toolbar */}
                <ResultFilters
                  filters={resultFilters}
                  onChangeFilter={handleChangeResultFilter}
                  onClearFilters={handleClearResultFilters}
                />

                {/* Empty results / No matching filters view */}
                {allJobs.length === 0 ? (
                  hasActiveResultFilters ? (
                    <EmptyState
                      title="No jobs match"
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleClearResultFilters}
                          className="mt-2"
                        >
                          <span>Clear filters</span>
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      title="No jobs found"
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsCollapsed(false)}
                          className="mt-2"
                        >
                          <span>Edit search</span>
                        </Button>
                      }
                    />
                  )
                ) : (
                  /* Job Cards Grid (1 col below 768px, 2 cols from 768px) */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          resumeId={activeResumeId}
                          onOpenTrackDialog={(targetJob) =>
                            setDialogJob(targetJob)
                          }
                        />
                      ))}
                    </div>

                    {/* Centered Load more button (no counts, hides when no next page) */}
                    {hasNextPage && (
                      <div className="pt-2 flex justify-center">
                        <ButtonHoverOutline
                          onClick={handleLoadMore}
                          disabled={isFetchingNextPage}
                          loading={isFetchingNextPage}
                          className="min-w-[140px]"
                        >
                          Load more
                        </ButtonHoverOutline>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* "Did you apply?" Dialog */}
      <DidYouApplyDialog
        isOpen={Boolean(dialogJob)}
        job={dialogJob}
        resumeId={activeResumeId}
        onClose={() => setDialogJob(null)}
      />
    </div>
  );
}
