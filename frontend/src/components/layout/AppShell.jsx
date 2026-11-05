/**
 * AppShell layout component
 * Layout wrapper providing skip link, sticky top bar, main content area,
 * mobile bottom navigation, and route effects.
 */
import React from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar.jsx";
import { BottomNav } from "./BottomNav.jsx";
import { RouteEffects } from "./RouteEffects.jsx";
import { usePageMeta } from "../../hooks/usePageMeta.js";

export function AppShell() {
  usePageMeta({ noindex: true });

  return (
    <div className="min-h-screen bg-paper flex flex-col text-ink antialiased">
      {/* Skip to content link */}
      <a
        href="#main"
        onClick={() => {
          const el = document.getElementById("main");
          if (el) {
            el.focus();
          }
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink focus:text-paper focus:font-medium focus:text-[14px] focus:rounded-[8px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink select-none"
      >
        Skip to content
      </a>

      {/* Route effects (scroll restoration, focus, announcements) */}
      <RouteEffects />

      {/* Top Bar (Sticky desktop and mobile) */}
      <TopBar />

      {/* Main Content Area */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 focus:outline-none pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile only) */}
      <BottomNav />
    </div>
  );
}

export default AppShell;
