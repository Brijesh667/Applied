import React from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Button } from "../components/ui/Button.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { usePageMeta } from "../hooks/usePageMeta.js";

export default function NotFound() {
  usePageTitle("Page not found");
  usePageMeta({ noindex: true });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <EmptyState
        headingTag="h1"
        title="Page not found"
        description="The page you opened doesn't exist or was moved."
        action={
          <Button onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        }
      />
    </div>
  );
}
