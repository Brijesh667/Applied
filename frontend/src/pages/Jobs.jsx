import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, RotateCw, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { useResumes } from "../hooks/useResumes.js";
import { useJobSearch } from "../hooks/useJobSearch.js";
import { PageContainer } from "../components/layout/PageContainer.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Select } from "../components/ui/Select.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { JobCard } from "../components/jobs/JobCard.jsx";
import { JobCardSkeleton } from "../components/jobs/JobCardSkeleton.jsx";
import { DidYouApplyDialog } from "../components/jobs/DidYouApplyDialog.jsx";
import { usePendingApply } from "../hooks/usePendingApply.js";
import { JOB_REFRESH_COOLDOWN_MS } from "../lib/constants.js";
import { cn } from "../lib/cn.js";

/**
 * Format relative time for updated timestamp.
 */
function formatRelativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
}

/**
 * Map API error to user-friendly messages.
 */
function mapJobSearchError(error) {
  const status = error?.status;
  if (status === 400) {
    return "Invalid search request. Check your resume details and try again.";
  }
  if (status === 404) {
    return "Resume not found. It may have been deleted.";
  }
  if (status === 429) {
    return "You've reached the search rate limit. Please try again later.";
  }
  if (status === 502) {
    return "Job search providers are currently unavailable. Please try again in a few minutes.";
  }
  if (status === 503) {
    return "Job search is not configured yet. Please check back later.";
  }
  return error?.message || "Couldn't search for jobs right now. Check your connection and try again.";
}

export default function Jobs() {
  usePageTitle("Jobs");

  const [searchParams, setSearchParams] = useSearchParams();
  const urlResumeId = searchParams.get("resume") || "";

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
      return defaultResume ? defaultResume._id || defaultResume.id : resumes[0]._id || resumes[0].id;
    }
    return "";
  }, [urlResumeId, resumes]);

  // Keep URL in sync when default is resolved
  useEffect(() => {
    if (activeResumeId && urlResumeId !== activeResumeId) {
      setSearchParams({ resume: activeResumeId }, { replace: true });
    }
  }, [activeResumeId, urlResumeId, setSearchParams]);

  const selectedResume = resumes.find((r) => (r._id || r.id) === activeResumeId) || null;

  // Search hook for active resume
  const {
    data: searchData,
    isLoading: isSearching,
    isError: isSearchError,
    error: searchError,
    search,
  } = useJobSearch(activeResumeId);

  // Client-side sort: "match" (Best match) vs "date" (Newest)
  const [sortBy, setSortBy] = useState("match");

  // "Did you apply?" Dialog state
  const [dialogJob, setDialogJob] = useState(null);

  // Hook to detect tab returns after clicking Apply
  usePendingApply({
    jobs: searchData?.jobs || [],
    isDialogOpen: Boolean(dialogJob),
    onTriggerDialog: (job) => setDialogJob(job),
  });

  // Selection change handler
  const handleSelectResume = (e) => {
    const nextId = e.target.value;
    setSearchParams({ resume: nextId });
  };

  // Pre-condition state evaluations
  const hasSkills = (selectedResume?.skills?.length ?? 0) > 0;
  const hasRoles = (selectedResume?.roleTitles?.length ?? 0) > 0;
  const isPending = selectedResume?.parseStatus === "pending";
  const hasSufficientCriteria = hasSkills || hasRoles;

  const canSearch = Boolean(selectedResume && !isPending && hasSufficientCriteria && !isSearching);

  const handleSearch = async (refresh = false) => {
    if (!canSearch && !refresh) return;
    try {
      await search({ refresh });
    } catch {
      // Error is captured in mutation state
    }
  };

  // Sorted job results
  const sortedJobs = useMemo(() => {
    if (!searchData?.jobs) return [];
    const list = [...searchData.jobs];
    if (sortBy === "date") {
      return list.sort((a, b) => {
        const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return timeB - timeA;
      });
    }
    // Default: Best match (descending score)
    return list.sort((a, b) => {
      const scoreA = typeof a.matchScore === "number" ? a.matchScore : 0;
      const scoreB = typeof b.matchScore === "number" ? b.matchScore : 0;
      return scoreB - scoreA;
    });
  }, [searchData?.jobs, sortBy]);

  // Check cooldown status
  const isWithinCooldown =
    Boolean(searchData?.cached) &&
    Boolean(searchData?.generatedAt) &&
    Date.now() - new Date(searchData.generatedAt).getTime() < JOB_REFRESH_COOLDOWN_MS;

  return (
    <PageContainer>
      <PageHeader
        title="Jobs"
        description="Find jobs that match one of your resumes."
      />

      {/* Loading resumes skeleton */}
      {isResumesLoading && (
        <div className="space-y-4">
          <div className="h-10 w-64 bg-sunken rounded-[8px] animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
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
            <Button
              variant="primary"
              onClick={() => {}}
              className="mt-2"
            >
              <Link to="/resumes" className="inline-flex items-center gap-1.5 text-inherit">
                <span>Go to Resumes</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
      )}

      {/* Normal View: Resumes exist */}
      {!isResumesLoading && !isResumesError && resumes.length > 0 && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 sm:p-5 rounded-[12px] bg-surface border border-rule">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
              {/* Resume Selector */}
              <div className="flex-1 min-w-[200px]">
                <label
                  htmlFor="resume-select"
                  className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-1.5"
                >
                  Select resume
                </label>
                <Select
                  id="resume-select"
                  value={activeResumeId}
                  onChange={handleSelectResume}
                  disabled={isSearching}
                  aria-label="Select resume"
                >
                  {resumes.map((resume) => {
                    const id = resume._id || resume.id;
                    const label = resume.label || resume.fileName || "Untitled resume";
                    const defaultMarker = resume.isDefault ? " (Default)" : "";
                    return (
                      <option key={id} value={id}>
                        {label}
                        {defaultMarker}
                      </option>
                    );
                  })}
                </Select>
              </div>

              {/* Primary Search Button */}
              <div className="shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  disabled={!canSearch}
                  loading={isSearching}
                  onClick={() => handleSearch(false)}
                  className="w-full sm:w-auto"
                >
                  <Search className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  <span>Find jobs</span>
                </Button>
              </div>
            </div>

            {/* Inline warning for pending parse */}
            {isPending && (
              <div
                role="status"
                className="mt-3 text-[13px] leading-[18px] text-ink-soft inline-flex items-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>Resume is still being parsed. Please wait a moment.</span>
              </div>
            )}

            {/* Inline warning for empty skills & roles */}
            {!isPending && !hasSufficientCriteria && (
              <div
                role="status"
                className="mt-3 text-[13px] leading-[18px] text-ink-soft flex items-center flex-wrap gap-1"
              >
                <AlertCircle className="w-4 h-4 text-ink-soft shrink-0" aria-hidden="true" />
                <span>Add at least one skill or role title to this resume to search for jobs.</span>
                <Link
                  to="/resumes"
                  className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 ml-1"
                >
                  <span>Edit in Resumes</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>

          {/* Searching Announcement & Skeletons */}
          {isSearching && (
            <div>
              <p className="sr-only" aria-live="polite">
                Searching jobs for this resume. This can take up to a minute.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
              </div>
            </div>
          )}

          {/* Search Error State */}
          {!isSearching && isSearchError && (
            <ErrorState
              title="Couldn't find jobs"
              message={mapJobSearchError(searchError)}
              onRetry={() => handleSearch(false)}
            />
          )}

          {/* Search Results */}
          {!isSearching && !isSearchError && searchData && (
            <div className="space-y-4">
              {/* Results Subheader */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-rule">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] leading-[24px] font-semibold text-ink">
                      {searchData.total ?? sortedJobs.length}{" "}
                      {searchData.total === 1 ? "job" : "jobs"} for{" "}
                      {selectedResume?.label || "this resume"}
                    </h2>
                  </div>

                  {/* Relative update time and cooldown note */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[18px] text-ink-soft mt-0.5">
                    {searchData.generatedAt && (
                      <span className="tabular-nums">
                        Updated {formatRelativeTime(searchData.generatedAt)}
                      </span>
                    )}

                    {isWithinCooldown && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>These results are less than an hour old, so we kept them.</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side: Sort toggle & Search again */}
                <div className="flex items-center gap-2.5 sm:self-auto self-start">
                  {/* Client-side Sort Toggle */}
                  <div className="inline-flex items-center p-0.5 rounded-[8px] bg-sunken border border-rule/60 text-[13px]">
                    <button
                      type="button"
                      onClick={() => setSortBy("match")}
                      className={cn(
                        "px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer select-none",
                        sortBy === "match"
                          ? "bg-surface text-ink shadow-xs"
                          : "text-ink-soft hover:text-ink"
                      )}
                    >
                      Best match
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("date")}
                      className={cn(
                        "px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer select-none",
                        sortBy === "date"
                          ? "bg-surface text-ink shadow-xs"
                          : "text-ink-soft hover:text-ink"
                      )}
                    >
                      Newest
                    </button>
                  </div>

                  {/* Refresh / Search again button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSearch(true)}
                    disabled={isSearching}
                    title="Refresh results from providers"
                  >
                    <RotateCw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    <span>Search again</span>
                  </Button>
                </div>
              </div>

              {/* Quiet note when ranked locally */}
              {searchData.rankedBy === "local" && (
                <div className="text-[13px] leading-[18px] text-ink-soft flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-sunken/40 border border-rule/50">
                  <Sparkles className="w-4 h-4 text-ink-soft shrink-0" aria-hidden="true" />
                  <span>Scores are based on how many of your skills appear in each job.</span>
                </div>
              )}

              {/* Empty results view */}
              {sortedJobs.length === 0 ? (
                <EmptyState
                  title="No jobs found"
                  description="We couldn't find any openings matching this resume's skills or roles. Try updating your resume with more skills."
                  action={
                    <Button variant="secondary" size="sm" className="mt-2">
                      <Link to="/resumes" className="inline-flex items-center gap-1 text-inherit">
                        <span>Update resume</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  }
                />
              ) : (
                /* 2-column desktop, 1-column mobile Grid */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      resumeId={activeResumeId}
                      onOpenTrackDialog={(targetJob) => setDialogJob(targetJob)}
                    />
                  ))}
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
    </PageContainer>
  );
}
