/**
 * Landing Page component
 * Public front door for Applied (Landing v3):
 * - Sticky navbar with anchor links to #solution, #how, #faq
 * - Hero: 3 KPIs + Needs Attention preview
 * - Problem and solution: 3 alternating rows
 * - How it works: 3 steps with connector line
 * - FAQ: 4 items accessible accordion
 * - Final CTA
 * - Footer
 * - Integrated URL-driven AuthDialog modal
 */
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { APP_NAME, TAGLINE } from "../lib/brand.js";
import { Logo } from "../components/ui/Logo.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { LandingNavbar } from "../components/landing/LandingNavbar.jsx";
import { LandingHero } from "../components/landing/LandingHero.jsx";
import { LandingProblemSolution } from "../components/landing/LandingProblemSolution.jsx";
import { LandingHowItWorks } from "../components/landing/LandingHowItWorks.jsx";
import { LandingFAQ } from "../components/landing/LandingFAQ.jsx";
import { LandingClosing } from "../components/landing/LandingClosing.jsx";
import { LandingFooter } from "../components/landing/LandingFooter.jsx";
import { AuthDialog } from "../components/auth/AuthDialog.jsx";

export default function Landing() {
  usePageTitle(`${APP_NAME} - ${TAGLINE}`);
  usePageMeta({
    description: "Know where you applied and what is due next. Track job and internship applications, replies and deadlines.",
  });

  const { user, isLoading, isError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const hasSessionHint =
    typeof window !== "undefined" &&
    localStorage.getItem("session-hint") === "1";

  // Redirect authenticated users directly to /dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleOpenAuth = () => {
    navigate("/?auth=login", {
      state: { ...location.state, authOpenedInApp: true },
    });
  };

  const handleOpenRegister = () => {
    navigate("/?auth=register", {
      state: { ...location.state, authOpenedInApp: true },
    });
  };

  // If user has a session hint and auth status is pending, show splash screen
  // If request fails (server down/offline), fallback directly to landing page
  if (hasSessionHint && isLoading && !isError) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 p-6 select-none">
        <Logo size="lg" />
        <Spinner size="md" />
      </div>
    );
  }

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
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:font-medium focus:text-[14px] focus:rounded-[8px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary select-none"
      >
        Skip to content
      </a>

      {/* Sticky Navbar */}
      <LandingNavbar onOpenAuth={handleOpenAuth} onOpenRegister={handleOpenRegister} />

      {/* Main Content */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 focus:outline-none w-full"
      >
        <LandingHero onOpenRegister={handleOpenRegister} />

        <LandingProblemSolution />

        <LandingHowItWorks />

        <LandingFAQ />

        <LandingClosing onOpenRegister={handleOpenRegister} />
      </main>

      {/* Footer */}
      <LandingFooter />

      {/* Modal / Bottom-Sheet Auth Dialog */}
      <AuthDialog />
    </div>
  );
}
