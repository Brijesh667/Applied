/**
 * LandingNavbar component
 * Sticky topbar for Landing Page v3:
 * - Uses --topbar-h (h-14 mobile, h-16 desktop)
 * - Left: Wordmark "Applied" (link to top)
 * - Center (md+): Anchor links "Features" (#solution), "How it works" (#how), "FAQ" (#faq)
 * - Right: Theme toggle + "Start tracking" button (compact "Start" on mobile)
 * - Mobile: Theme toggle + compact Start + menu button for anchor links
 * - Sliding indicator for active section with IntersectionObserver
 * - Zero auth links on landing page
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sun, Moon, Menu as MenuIcon, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { Logo } from "../ui/Logo.jsx";
import { navContent } from "../../lib/landingContent.js";
import { cn } from "../../lib/cn.js";

export function LandingNavbar({ onOpenAuth, onOpenRegister }) {
  const handleAuth = onOpenAuth || onOpenRegister;
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const [activeSection, setActiveSection] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Measure active anchor link for the sliding indicator
  const navRef = useRef(null);
  const linksRef = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Update sliding indicator position
  const updateIndicator = useCallback(() => {
    if (!activeSection || !navRef.current) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const targetEl = linksRef.current[activeSection];
    if (targetEl && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      setIndicatorStyle({
        left: targetRect.left - navRect.left,
        width: targetRect.width,
        opacity: 1,
      });
      setIsReady(true);
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeSection]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  // Handle window resize & font loading
  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateIndicator);
    }
    return () => window.removeEventListener("resize", handleResize);
  }, [updateIndicator]);

  // Section observer for active anchor highlight
  useEffect(() => {
    const sectionIds = ["solution", "how", "faq"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (elements.length === 0 || typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new window.IntersectionObserver(
      (entries) => {
        // Find visible section closest to top
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Sort by distance to topbar
          visible.sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top)
          );
          setActiveSection(visible[0].target.id);
        } else {
          // If scrolled above first section
          const firstTop = elements[0].getBoundingClientRect().top;
          if (firstTop > 200) {
            setActiveSection(null);
          }
        }
      },
      {
        rootMargin: "-20% 0px -50% 0px",
        threshold: [0, 0.2, 0.5],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleScrollTo = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetId = href.replace(/^#/, "");
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      // Set hash without jump
      window.history.pushState(null, "", href);
      setActiveSection(targetId);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 md:h-16 bg-paper/95 backdrop-blur-xs border-b border-rule select-none transition-colors">
      <div className="max-w-[1120px] mx-auto h-full px-4 sm:px-6 md:px-8 flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
        {/* Left: Brand Logo */}
        <div className="flex items-center justify-start">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? "auto" : "smooth",
              });
              window.history.pushState(null, "", window.location.pathname);
              setActiveSection(null);
            }}
            className="focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[6px]"
            aria-label="Applied home"
          >
            <Logo size="md" />
          </a>
        </div>

        {/* Center: Desktop Anchor Links (md+) */}
        <div className="hidden md:flex items-center justify-center relative">
          <nav
            ref={navRef}
            aria-label="Page navigation"
            className="flex items-center gap-8 relative py-2"
          >
            {navContent.links.map((link) => {
              const sectionId = link.href.replace(/^#/, "");
              const isActive = activeSection === sectionId;

              return (
                <a
                  key={link.href}
                  ref={(el) => {
                    linksRef.current[sectionId] = el;
                  }}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative px-3 py-2 text-[14px] leading-[20px] transition-colors duration-150 rounded-[6px] focus:outline-none focus-visible:outline-2 focus-visible:outline-primary",
                    isActive
                      ? "font-semibold text-ink"
                      : "font-normal text-ink-soft hover:text-ink"
                  )}
                >
                  {/* Reserve bold width */}
                  <span className="font-semibold invisible select-none h-0 block overflow-hidden" aria-hidden="true">
                    {link.label}
                  </span>
                  <span>{link.label}</span>
                </a>
              );
            })}

            {/* Sliding 2px primary active indicator line */}
            <div
              aria-hidden="true"
              style={{
                transform: `translateX(${indicatorStyle.left}px)`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
              }}
              className={cn(
                "absolute -bottom-2 md:-bottom-3 left-0 h-[2px] bg-primary pointer-events-none",
                !isReady || prefersReducedMotion
                  ? "transition-none"
                  : "transition-[transform,width,opacity] duration-250 ease-out"
              )}
            />
          </nav>
        </div>

        {/* Right: Theme Toggle & CTA */}
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

          {/* Sign in: normal text, turns blue (primary) on hover */}
          <button
            type="button"
            onClick={handleAuth}
            className="px-3 py-1.5 text-[14px] leading-[20px] font-medium text-ink hover:text-primary transition-colors rounded-[6px] cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-primary select-none shrink-0"
          >
            {navContent.signIn}
          </button>

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
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAuth();
                }}
                className="w-full px-3 py-2 rounded-[6px] text-[14px] font-medium text-left text-ink hover:bg-sunken hover:text-primary transition-colors cursor-pointer"
              >
                {navContent.signIn}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default LandingNavbar;
