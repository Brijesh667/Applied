/**
 * TopBar component
 * Desktop (md and up): 3-zone layout with equal 1fr left and right zones and truly centered nav.
 * Mobile (below md): 2-zone layout (left logo, right theme toggle + avatar). No Add button.
 *
 * Features:
 * - Clean wordmark logo (link to /dashboard, no dot/swipe).
 * - Animated sliding pill tab navigation (Aceternity UI tabs style with motion layoutId).
 * - Animated 2px primary progress line along header top edge on route change (350ms ease-out).
 * - Respects prefers-reduced-motion, WCAG AA, and maintains exact --topbar-h.
 */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext.jsx";
import { APP_NAME } from "../../lib/brand.js";
import { statsApi } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queryKeys.js";
import { Logo } from "../ui/Logo.jsx";
import { ShimmerButton } from "../../registry/buttons/shimmer-button.jsx";
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

  const navTabs = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        to: "/dashboard",
        end: true,
        isActive: isDashboardActive,
        prefetch: prefetchDashboard,
      },
      {
        id: "applications",
        label: "Applications",
        to: "/applications",
        end: false,
        isActive: isApplicationsActive,
        prefetch: prefetchApplications,
      },
      {
        id: "jobs",
        label: "Jobs",
        to: "/jobs",
        end: false,
        isActive: isJobsActive,
        prefetch: prefetchJobs,
      },
      {
        id: "resumes",
        label: "Resumes",
        to: "/resumes",
        end: false,
        isActive: isResumesActive,
        prefetch: prefetchResumes,
      },
    ],
    [isDashboardActive, isApplicationsActive, isJobsActive, isResumesActive]
  );

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

        {/* Zone 2 (Center): Centered desktop navigation with Aceternity sliding pill effect */}
        <nav
          aria-label="Main"
          className="hidden md:flex items-center justify-center h-full relative"
        >
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-sunken/60 dark:bg-zinc-800/40 border border-rule/50">
            {navTabs.map((tab) => {
              const isActive = activeNav === tab.id;
              return (
                <NavLink
                  key={tab.id}
                  to={tab.to}
                  end={tab.end}
                  aria-current={isActive ? "page" : undefined}
                  onMouseEnter={tab.prefetch}
                  onFocus={tab.prefetch}
                  className={cn(
                    "relative px-4 py-1.5 text-[14px] leading-none select-none rounded-full transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-primary",
                    isActive
                      ? "font-semibold text-ink"
                      : "font-medium text-ink-soft hover:text-ink"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="topbar-active-tab"
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { type: "spring", bounce: 0.25, duration: 0.5 }
                      }
                      className="absolute inset-0 bg-surface dark:bg-zinc-700/80 rounded-full shadow-xs border border-rule/70"
                    />
                  )}
                  <span className="relative z-10 block">{tab.label}</span>
                </NavLink>
              );
            })}
          </div>
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
            <ShimmerButton className="shadow-lg h-8 px-3.5 text-sm font-medium">
              <span className="text-sm font-medium text-white">Add application</span>
            </ShimmerButton>
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
