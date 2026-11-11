/**
 * LandingNavbar component
 * Sticky topbar for Landing Page:
 * - Uses --topbar-h (h-14 mobile, h-16 desktop)
 * - Left: Wordmark "Applied" (link to top)
 * - Center (md+): Anchor links "Features" (#solution), "How it works" (#how), "FAQ" (#faq) with Aceternity sliding pill effect
 * - Right: Theme toggle + Sign in button
 * - Mobile: Theme toggle + Sign in + menu button for anchor links
 * - Animated sliding pill indicator for active section with smooth scroll & scroll-spy
 * - Respects prefers-reduced-motion
 */
import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Sun, Moon, Menu as MenuIcon, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { Logo } from "../ui/Logo.jsx";
import { SignInButton } from "../ui/SignInButton.jsx";
import { navContent } from "../../lib/landingContent.js";
import { cn } from "../../lib/cn.js";

const SECTION_IDS = ["solution", "how", "faq"];

export function LandingNavbar({ onOpenAuth, onOpenRegister }) {
  const handleAuth = onOpenAuth || onOpenRegister;
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const getInitialSection = () => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashId = window.location.hash.replace(/^#/, "");
      if (SECTION_IDS.includes(hashId)) {
        return hashId;
      }
    }
    return "solution";
  };

  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isClickScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Real-time scroll spy that updates active navigation pill as user scrolls
  useEffect(() => {
    let rafId = null;

    const onScroll = () => {
      if (isClickScrollingRef.current) return;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;

        // If at or near bottom of page, activate last tab (faq)
        if (scrollY + viewportHeight >= docHeight - 80) {
          setActiveSection("faq");
          return;
        }

        const navOffset = 140; // Detection threshold below navbar

        const sections = SECTION_IDS.map((id) => {
          const el = document.getElementById(id);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            id,
            top: rect.top + window.scrollY,
          };
        }).filter(Boolean);

        if (sections.length === 0) return;

        // If above solution section (hero area), keep Features active
        if (scrollY + navOffset < sections[0].top) {
          setActiveSection("solution");
          return;
        }

        // Determine which section currently occupies the viewport
        let current = sections[0].id;
        for (let i = 0; i < sections.length; i++) {
          if (scrollY + navOffset >= sections[i].top) {
            current = sections[i].id;
          }
        }
        setActiveSection(current);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Initial check on mount
    onScroll();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const handleScrollTo = (e, href) => {
    if (e && e.preventDefault) e.preventDefault();
    setMobileMenuOpen(false);

    const targetId = href.replace(/^#/, "");
    // 1. Immediately slide tab pill to the clicked tab
    setActiveSection(targetId);

    // 2. Lock scroll spy so it doesn't fight the user's click during animation
    isClickScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      const navHeight = 64; // height of sticky topbar
      const targetY = targetEl.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      // Update URL hash without causing an instant browser jump
      window.history.pushState(null, "", href);
    }

    // 3. Release scroll lock after smooth scroll animation completes
    scrollTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 850);
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    setActiveSection("solution");
    isClickScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    window.history.pushState(null, "", window.location.pathname);

    scrollTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 850);
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 md:h-16 bg-paper/95 backdrop-blur-xs border-b border-rule select-none transition-colors">
      <div className="max-w-[1120px] mx-auto h-full px-4 sm:px-6 md:px-8 flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
        {/* Left: Brand Logo */}
        <div className="flex items-center justify-start">
          <a
            href="#"
            onClick={handleLogoClick}
            className="focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[6px]"
            aria-label="Applied home"
          >
            <Logo size="md" />
          </a>
        </div>

        {/* Center: Desktop Anchor Links with Aceternity sliding pill effect */}
        <div className="hidden md:flex items-center justify-center relative">
          <nav
            aria-label="Page navigation"
            className="flex items-center gap-1.5 p-1 rounded-full bg-sunken/60 dark:bg-zinc-800/40 border border-rule/50"
          >
            {navContent.links.map((link) => {
              const sectionId = link.href.replace(/^#/, "");
              const isActive = activeSection === sectionId;

              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative px-4 py-1.5 text-[14px] leading-none transition-colors duration-150 rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-primary select-none cursor-pointer",
                    isActive
                      ? "font-semibold text-ink"
                      : "font-medium text-ink-soft hover:text-ink"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="landing-active-tab"
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { type: "spring", bounce: 0.25, duration: 0.5 }
                      }
                      className="absolute inset-0 bg-surface dark:bg-zinc-700/80 rounded-full shadow-xs border border-rule/70"
                    />
                  )}
                  <span className="relative z-10 block">{link.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right: Theme Toggle & Sign in */}
        <div className="flex items-center justify-end gap-2.5 sm:gap-3">
          {/* Theme Toggle */}
          <button
            type="button"
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center text-ink hover:bg-sunken rounded-[8px] transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-primary select-none"
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

          {/* Sign in button with smooth sweep & roll hover effect */}
          <SignInButton onClick={handleAuth} className="shrink-0" />

          {/* Mobile Menu Toggle Button (below md) */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-ink hover:bg-sunken rounded-[8px] transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-primary"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <MenuIcon className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Anchor Links Dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden w-full bg-surface border-b border-rule px-4 py-3 shadow-md animate-in fade-in duration-150"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navContent.links.map((link) => {
              const sectionId = link.href.replace(/^#/, "");
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "px-3 py-2 rounded-[6px] text-[14px] font-medium transition-colors",
                    isActive
                      ? "bg-primary-soft text-primary font-semibold"
                      : "text-ink hover:bg-sunken"
                  )}
                >
                  {link.label}
                </a>
              );
            })}

            <div className="pt-2 mt-1 border-t border-rule/50">
              <SignInButton
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAuth();
                }}
                className="w-full"
              />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default LandingNavbar;
