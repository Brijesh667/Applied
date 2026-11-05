/**
 * LandingFooter component
 * Public landing page footer:
 * - Same max-w-[1120px] container as PageContainer
 * - Left: Brand wordmark (clicks to scroll smoothly to top) + Tagline with larger typography
 * - Right: GitHub & LinkedIn external links with larger typography (no "Project" label)
 * - Removed bottom copyright row ("© 2026 Applied") and stack info ("Built with React...")
 */
import React from "react";
import { Logo } from "../ui/Logo.jsx";
import { links } from "../../lib/brand.js";
import { footerContent } from "../../lib/landingContent.js";

export function LandingFooter() {
  const projectLinks = [
    { label: "GitHub", href: links?.github },
    { label: "LinkedIn", href: links?.linkedin },
  ].filter((item) => Boolean(item.href && item.href.trim()));

  const handleScrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    window.history.pushState(null, "", window.location.pathname);
  };

  return (
    <footer className="w-full border-t border-rule py-12 md:py-16 select-none bg-paper">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Left: Brand Wordmark (Click scrolls to top) + Tagline */}
        <div className="flex flex-col items-start">
          <a
            href="#"
            onClick={handleScrollToTop}
            aria-label="Applied - scroll to top"
            className="focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[6px] cursor-pointer inline-block"
          >
            <Logo size="lg" className="hover:opacity-85 transition-opacity" />
          </a>
          <p className="text-[16px] md:text-[18px] leading-[26px] text-ink-soft mt-2">
            {footerContent.tagline}
          </p>
        </div>

        {/* Right: GitHub & LinkedIn Links */}
        {projectLinks.length > 0 && (
          <nav
            aria-label="Project links"
            className="flex items-center gap-6 text-[16px] md:text-[17px] font-medium text-ink-soft"
          >
            {projectLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink transition-colors underline-offset-4 hover:underline"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}

export default LandingFooter;
