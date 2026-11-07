/**
 * BottomNav component
 * Mobile fixed bottom tab bar with Dashboard, Add, and Applications tabs.
 * Strictly hidden on desktop (md:hidden).
 * All three tabs share the exact same style:
 * - Icon above label, equal width (flex-1), min touch target 44px (h-14 / 56px).
 * - Inactive: muted text/icon, no background.
 * - Active: ink-colored text/icon, semibold label, subtle surface background,
 *   and a 2px indicator line at the top of the item.
 * - aria-current="page" on the active link.
 * - Add is active only on /applications/new.
 * - Applications is active on /applications and child routes (/applications/:id, etc.), except /applications/new.
 * - Dashboard is active on /dashboard (and /).
 * - Transition 150ms; reduced motion: no transform.
 * - Respects safe-area inset at the bottom.
 */
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Plus, Briefcase, FileText } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { useInteractiveButton } from "../../hooks/useInteractiveButton.js";

function BottomNavItem({ to, isActive, icon: Icon, label, prefetch }) {
  const { rippleRef, isPressed, handlers } = useInteractiveButton({
    isPrimary: false,
  });

  return (
    <Link
      to={to}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
      onFocus={prefetch}
      className={cn(
        "btn-interactive flex-1 h-full min-h-[44px] flex flex-col items-center justify-center relative py-1 px-2 select-none",
        "transition-all duration-150 motion-reduce:transition-none motion-reduce:transform-none",
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]",
        isActive
          ? "text-ink font-semibold bg-surface/90 before:content-[''] before:absolute before:top-0 before:left-2 before:right-2 before:h-[2px] before:bg-primary"
          : "text-ink-soft font-medium hover:text-ink hover:bg-sunken/40",
        isPressed && "is-pressed"
      )}
      {...handlers}
    >
      <span ref={rippleRef} className="btn-ripple-container" aria-hidden="true" />
      <span className="relative z-[2] flex flex-col items-center justify-center gap-0.5 pointer-events-none">
        <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="text-[11px] leading-[14px] truncate">{label}</span>
      </span>
    </Link>
  );
}

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const isDashboardActive = pathname === "/dashboard" || pathname === "/";
  const isAddActive = pathname === "/applications/new";
  const isApplicationsActive =
    pathname.startsWith("/applications") && pathname !== "/applications/new";
  const isResumesActive = pathname.startsWith("/resumes");

  const prefetchDashboard = () => {
    import("../../pages/Dashboard.jsx");
  };

  const prefetchNewApplication = () => {
    import("../../pages/ApplicationForm.jsx");
  };

  const prefetchApplications = () => {
    import("../../pages/Applications.jsx");
  };

  const prefetchResumes = () => {
    import("../../pages/Resumes.jsx");
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-rule md:hidden pb-[env(safe-area-inset-bottom)] select-none"
    >
      <div className="h-14 flex items-center justify-around w-full">
        <BottomNavItem
          to="/dashboard"
          isActive={isDashboardActive}
          icon={LayoutDashboard}
          label="Dashboard"
          prefetch={prefetchDashboard}
        />

        <BottomNavItem
          to="/applications/new"
          isActive={isAddActive}
          icon={Plus}
          label="Add"
          prefetch={prefetchNewApplication}
        />

        <BottomNavItem
          to="/applications"
          isActive={isApplicationsActive}
          icon={Briefcase}
          label="Applications"
          prefetch={prefetchApplications}
        />

        <BottomNavItem
          to="/resumes"
          isActive={isResumesActive}
          icon={FileText}
          label="Resumes"
          prefetch={prefetchResumes}
        />
      </div>
    </nav>
  );
}

export default BottomNav;
