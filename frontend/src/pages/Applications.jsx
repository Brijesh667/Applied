/**
 * Applications page
 * Displays application cards with URL-synced search/filter/sort, infinite loading,
 * and comprehensive error / empty / loading states.
 * Sticky filter bar under top bar, 3D tilt + glow on cards, and animated load more.
 */
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { useApplicationFilters } from "../hooks/useApplicationFilters.js";
import { useApplications } from "../hooks/useApplications.js";
import { CursorGlow } from "../components/effects/CursorGlow.jsx";
import { PageContainer } from "../components/layout/PageContainer.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { FilterBar } from "../components/applications/FilterBar.jsx";
import {
  ApplicationCard,
  ApplicationCardSkeleton,
} from "../components/applications/ApplicationCard.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { cn } from "../lib/cn.js";

export default function Applications() {
  usePageTitle("Applications");

  const {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    activeCount,
  } = useApplicationFilters();

  const {
    applications,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    error,
    refetch,
    isPlaceholderData,
  } = useApplications(filters);

  const [loadMoreError, setLoadMoreError] = useState(null);
  const [loadAnnouncement, setLoadAnnouncement] = useState("");
  const [animatingStartIndex, setAnimatingStartIndex] = useState(-1);
  const prevCountRef = useRef(applications.length);

  // Sentinel detection for sticky FilterBar
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    let observer;

    const updateObserver = () => {
      if (observer) observer.disconnect();
      const topbarHeight = window.innerWidth >= 768 ? 64 : 56;
      observer = new window.IntersectionObserver(
        ([entry]) => {
          setIsStuck(
            !entry.isIntersecting && entry.boundingClientRect.top <= topbarHeight
          );
        },
        {
          rootMargin: `-${topbarHeight}px 0px 0px 0px`,
          threshold: 0,
        }
      );
      observer.observe(sentinel);
    };

    updateObserver();
    window.addEventListener("resize", updateObserver);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateObserver);
    };
  }, []);

  // Track newly loaded cards for staggered entrance animation
  useEffect(() => {
    if (applications.length > prevCountRef.current && prevCountRef.current > 0) {
      setAnimatingStartIndex(prevCountRef.current);
      const added = applications.length - prevCountRef.current;
      setLoadAnnouncement(`${added} more applications loaded`);
    } else if (applications.length <= prevCountRef.current) {
      setAnimatingStartIndex(-1);
    }
    prevCountRef.current = applications.length;
  }, [applications.length]);

  // Smooth fade-out when hasNextPage becomes false
  const [isButtonVisible, setIsButtonVisible] = useState(hasNextPage);
  const [isButtonFadingOut, setIsButtonFadingOut] = useState(false);

  useEffect(() => {
    if (hasNextPage) {
      setIsButtonVisible(true);
      setIsButtonFadingOut(false);
    } else if (isButtonVisible && !hasNextPage) {
      setIsButtonFadingOut(true);
      const timer = setTimeout(() => {
        setIsButtonVisible(false);
        setIsButtonFadingOut(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [hasNextPage, isButtonVisible]);

  const handleLoadMore = async () => {
    setLoadMoreError(null);
    try {
      const res = await fetchNextPage();
      if (res.isError) {
        setLoadMoreError("Couldn't load more applications. Try again.");
      }
    } catch {
      setLoadMoreError("Couldn't load more applications. Try again.");
    }
  };

  return (
    <>
      {/* Page cursor glow (fixed below content, mounted only on /applications) */}
      <CursorGlow />

      <PageContainer className="relative z-[1]">
        <PageHeader title="Applications" />

        {/* Sentinel element to detect when FilterBar sticks under TopBar */}
        <div
          ref={sentinelRef}
          className="h-px w-full pointer-events-none -mb-px opacity-0"
          aria-hidden="true"
        />

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          activeCount={activeCount}
          isStuck={isStuck}
        />

        {/* Announcement live region */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {loadAnnouncement}
        </div>

        {/* State 1: Error with no loaded data */}
        {isError && applications.length === 0 ? (
          <ErrorState
            title="Can't load applications"
            message={
              error?.message ||
              "Can't reach the server. Check your connection and try again."
            }
            onRetry={refetch}
          />
        ) : isPending && applications.length === 0 ? (
          /* State 2: Initial loading skeleton (6 cards) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-full">
                <ApplicationCardSkeleton />
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          /* State 3: Empty results */
          hasActiveFilters ? (
            <EmptyState
              title={
                filters.deadline
                  ? "No applications match this deadline filter."
                  : "No applications match these filters"
              }
              description={
                filters.deadline
                  ? "Try a different deadline filter or clear all filters."
                  : "Try a different search or clear the filters."
              }
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No applications yet"
              description="Add the first one to start your log."
              action={
                <Link to="/applications/new">
                  <Button variant="primary" size="sm">
                    Add application
                  </Button>
                </Link>
              }
            />
          )
        ) : (
          /* State 4: List of applications */
          <div>
            {/* Cards Grid */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch opacity-100"
              aria-busy={isPlaceholderData}
            >
              {applications.map((app, index) => {
                const isNew =
                  animatingStartIndex !== -1 && index >= animatingStartIndex;
                return (
                  <div
                    key={app._id}
                    className={cn("h-full", isNew && "animate-card-enter")}
                    style={
                      isNew
                        ? {
                            animationDelay: `${
                              (index - animatingStartIndex) * 40
                            }ms`,
                          }
                        : undefined
                    }
                  >
                    <ApplicationCard application={app} />
                  </div>
                );
              })}
            </div>

            {/* Load More section */}
            {isButtonVisible && (
              <div
                className={cn(
                  "flex flex-col items-center justify-center mt-8 gap-2 transition-opacity duration-200 ease-out",
                  isButtonFadingOut
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                )}
              >
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  className="w-36 group transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  {isFetchingNextPage ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" />
                      <span>Loading</span>
                    </span>
                  ) : (
                    <span>Load more</span>
                  )}
                </Button>

                {loadMoreError && (
                  <div className="flex items-center gap-2 text-[14px] text-danger mt-1">
                    <span>{loadMoreError}</span>
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      className="underline hover:opacity-80 font-medium cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
