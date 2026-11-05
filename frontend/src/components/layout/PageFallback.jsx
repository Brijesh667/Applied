/**
 * PageFallback component
 * Full-page branded loading fallback used by React.lazy Suspense boundaries.
 * Matches ProtectedRoute loading state to prevent layout jumps during chunk loading.
 */
import React from "react";
import { Logo } from "../ui/Logo.jsx";
import { Spinner } from "../ui/Spinner.jsx";

export function PageFallback() {
  return (
    <div
      className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 p-6 select-none"
      role="status"
      aria-label="Loading page"
    >
      <Logo size="lg" />
      <Spinner size="md" />
    </div>
  );
}

export default PageFallback;