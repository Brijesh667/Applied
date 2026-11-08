/**
 * TopBar component
 * Desktop (md and up): 3-zone layout with equal 1fr left and right zones and truly centered nav.
 * Mobile (below md): 2-zone layout (left logo, right theme toggle + avatar). No Add button.
 *
 * Features:
 * - Clean wordmark logo (link to /dashboard, no dot/swipe).
 * - Nav links Dashboard & Applications with layout-shift-free font weight transition.
 * - Sliding 2px primary active indicator line along header bottom edge (250ms ease-out).
 * - Animated 2px primary progress line along header top edge on route change (350ms ease-out).
 * - Respects prefers-reduced-motion, WCAG AA, and maintains exact --topbar-h.
 */
import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext.jsx";
import { APP_NAME } from "../../lib/brand.js";
import { statsApi } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queryKeys.js";
import { Logo } from "../ui/Logo.jsx";
import { Button } from "../ui/Button.jsx";
import { UserMenu } from "./UserMenu.jsx";
import { cn } from "../../lib/cn.js";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const location = useLocation();

  // Active route matching
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isDashboardActive = normalizedPath === "/dashboard" || normalizedPath === "/";
  const isApplicationsActive =
    normalizedPath.startsWith("/applications") &&
    normalizedPath !== "/applications/new";
  const isJobsActive = normalizedPath.startsWith("/jobs");
  const isResumesActive = normalizedPath.startsWith("/resumes");

  const activeNav = isDashboardActive
    ? "dashboard"
    : isApplicationsActive
    ? "applications"
    : isJobsActive
    ? "jobs"
    : isResumesActive
    ? "resumes"
    : null;

  // Refs for sliding indicator
  const navRef = useRef(null);
  const dashboardRef = useRef(null);
  const applicationsRef = useRef(null);
  const jobsRef = useRef(null);
  const resumesRef = useRef(null);

  // Indicator measurement state
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [isReady, setIsReady] = useState(false);

  // Prefers reduced motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Route-change top progress line trigger
  const [progressKey, setProgressKey] = useState(0);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setProgressKey((prev) => prev + 1);
  }, [location.pathname, location.search]);

  // Recalculate indicator position and width
  const updateIndicator = useCallback(() => {
    let targetEl = null;
    if (activeNav === "dashboard") {
      targetEl = dashboardRef.current;
    } else if (activeNav === "applications") {
      targetEl = applicationsRef.current;
    } else if (activeNav === "jobs") {
      targetEl = jobsRef.current;
    } else if (activeNav === "resumes") {
      targetEl = resumesRef.current;
    }

    if (targetEl && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      if (targetRect.width > 0) {
        setIndicatorStyle({
          left: targetRect.left - navRect.left,
          width: targetRect.width,
          opacity: 1,
        });
        return;
      }
    }

    setIndicatorStyle((prev) => ({
      ...prev,
      opacity: 0,
    }));
  }, [activeNav]);

  // Initial and route-change measurement
  useLayoutEffect(() => {
    updateIndicator();
    // Enable sliding transitions after initial mount placement
    const timer = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(timer);
  }, [updateIndicator]);

  // Resize and font-load measurement
  useEffect(() => {
    const handleResize = () => {
      updateIndicator();
    };

    window.addEventListener("resize", handleResize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(updateIndicator);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateIndicator]);

  // Prefetch handlers
  const prefetchDashboard = () => {
    import("../../pages/Dashboard.jsx");
    queryClient.prefetchQuery({
      queryKey: queryKeys.stats,
      queryFn: statsApi.get,
      staleTime: 30000,
    });
  };

  const prefetchApplications = () => {
    import("../../pages/Applications.jsx");
  };

  const prefetchJobs = () => {
    import("../../pages/Jobs.jsx");
  };

  const prefetchResumes = () => {
    import("../../pages/Resumes.jsx");
  };

  const prefetchNewApplication = () => {
    import("../../pages/ApplicationForm.jsx");
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 md:h-16 bg-paper border-b border-rule select-none relative">
      {/* Route-change top progress feedback line */}
      {progressKey > 0 && (
        <span
          key={progressKey}
          aria-hidden="true"
          className="route-progress-bar"
        />
      )}

      {/* Inner container: 3-zone layout on desktop (grid-cols-[1fr_auto_1fr]), flex on mobile */}
      <div className="max-w-[1120px] mx-auto h-full px-4 sm:px-6 md:px-8 flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
        {/* Zone 1 (Left): Logo (justify-start) */}
        <div className="flex items-center justify-start h-full">
          <Link
            to="/dashboard"
            className="flex items-center focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-[6px]"
            aria-label={`${APP_NAME} Dashboard`}
            onMouseEnter={prefetchDashboard}
            onFocus={prefetchDashboard}
          >
            <Logo size="md" />
          </Link>
        </div>

        {/* Zone 2 (Center): Truly centered desktop navigation (hidden on mobile) */}
        <nav
          ref={navRef}
          aria-label="Main"
          className="hidden md:flex items-center justify-center h-full relative"
        >
          <div className="flex items-center gap-6 lg:gap-8 h-full">
            <NavLink
              ref={dashboardRef}
              to="/dashboard"
              end
              aria-current={isDashboardActive ? "page" : undefined}
              onMouseEnter={prefetchDashboard}
              onFocus={prefetchDashboard}
              className="relative flex items-center px-3 py-2 text-[15px] leading-none select-none focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-[6px]"
            >
              <span className="grid place-items-center">
                {/* Invisible font-semibold copy reserves width, preventing layout shift on weight change */}
                <span className="invisible font-semibold block" aria-hidden="true">
                  Dashboard
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 block transition-colors duration-150",
                    isDashboardActive
                      ? "font-semibold text-ink"
                      : "font-medium text-ink-soft hover:text-ink"
                  )}
                >
                  Dashboard
                </span>
              </span>
            </NavLink>

            <NavLink
              ref={applicationsRef}
              to="/applications"
              aria-current={isApplicationsActive ? "page" : undefined}
              onMouseEnter={prefetchApplications}
              onFocus={prefetchApplications}
              className="relative flex items-center px-3 py-2 text-[15px] leading-none select-none focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-[6px]"
            >
              <span className="grid place-items-center">
                {/* Invisible font-semibold copy reserves width, preventing layout shift on weight change */}
                <span className="invisible font-semibold block" aria-hidden="true">
                  Applications
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 block transition-colors duration-150",
                    isApplicationsActive
                      ? "font-semibold text-ink"
                      : "font-medium text-ink-soft hover:text-ink"
                  )}
                >
                  Applications
                </span>
              </span>
            </NavLink>

            <NavLink
              ref={jobsRef}
              to="/jobs"
              aria-current={isJobsActive ? "page" : undefined}
              onMouseEnter={prefetchJobs}
              onFocus={prefetchJobs}
              className="relative flex items-center px-3 py-2 text-[15px] leading-none select-none focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-[6px]"
            >
              <span className="grid place-items-center">
                {/* Invisible font-semibold copy reserves width, preventing layout shift on weight change */}
                <span className="invisible font-semibold block" aria-hidden="true">
                  Jobs
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 block transition-colors duration-150",
                    isJobsActive
                      ? "font-semibold text-ink"
                      : "font-medium text-ink-soft hover:text-ink"
                  )}
                >
                  Jobs
                </span>
              </span>
            </NavLink>

            <NavLink
              ref={resumesRef}
              to="/resumes"
              aria-current={isResumesActive ? "page" : undefined}
              onMouseEnter={prefetchResumes}
              onFocus={prefetchResumes}
              className="relative flex items-center px-3 py-2 text-[15px] leading-none select-none focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-[6px]"
            >
              <span className="grid place-items-center">
                {/* Invisible font-semibold copy reserves width, preventing layout shift on weight change */}
                <span className="invisible font-semibold block" aria-hidden="true">
                  Resumes
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 block transition-colors duration-150",
                    isResumesActive
                      ? "font-semibold text-ink"
                      : "font-medium text-ink-soft hover:text-ink"
                  )}
                >
                  Resumes
                </span>
              </span>
            </NavLink>
          </div>

          {/* Sliding 2px primary active indicator */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-0 left-0 h-[2px] bg-primary pointer-events-none",
              prefersReducedMotion || !isReady
                ? "transition-none"
                : "transition-[transform,width,opacity] duration-[250ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
            )}
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />
        </nav>

        {/* Zone 3 (Right): Actions (justify-end, gap 12px) */}
        <div className="flex items-center justify-end gap-3 h-full">
          {/* Add application button: strictly desktop only */}
          <Link
            to="/applications/new"
            tabIndex={-1}
            className="hidden md:inline-flex"
            onMouseEnter={prefetchNewApplication}
            onFocus={prefetchNewApplication}
          >
            <Button size="sm">
              Add application
            </Button>
          </Link>

          {/* Theme toggle: icon button on mobile and desktop */}
          <button
            type="button"
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-9 h-9 rounded-[8px] text-ink hover:bg-sunken transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-primary select-none"
          >
            {isDark ? (
              <Sun
                className="w-5 h-5 transition-transform duration-200 hover:rotate-12 motion-reduce:transform-none"
                aria-hidden="true"
              />
            ) : (
              <Moon
                className="w-5 h-5 transition-transform duration-200 hover:-rotate-12 motion-reduce:transform-none"
                aria-hidden="true"
              />
            )}
          </button>

          {/* User Profile Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export default TopBar;
